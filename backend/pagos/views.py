import hashlib
import hmac
import secrets
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import urlencode

from decouple import config
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Pago
from .serializers import PagoSerializer
from reservas.models import Reserva


def _total_reserva(reserva):
    return sum((item.precio_calculado or Decimal('0') for item in reserva.servicios_contratados.all()), Decimal('0'))


def _monto_a_cobrar(tipo, total, monto_reservado):
    saldo = total - monto_reservado
    if saldo <= 0:
        return Decimal('0.00')
    if tipo == 'TOTAL':
        return saldo
    anticipo = (total / 2).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return min(anticipo, saldo)


def _checkout_url(referencia, monto, public_key, integrity_secret):
    frontend_url = config('FRONTEND_URL', default='http://127.0.0.1:5173')
    monto = Decimal(str(monto))
    amount = int((monto * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    checksum = hashlib.sha256(f'{referencia}{amount}COP{integrity_secret}'.encode()).hexdigest()
    params = urlencode({
        'public-key': public_key,
        'currency': 'COP',
        'amount-in-cents': amount,
        'reference': referencia,
        'signature:integrity': checksum,
        'redirect-url': f'{frontend_url.rstrip("/")}/mis-reservas',
    })
    return f'https://checkout.wompi.co/p/?{params}'


def _checksum_evento_valido(transaction_data, properties, timestamp, checksum, secret):
    if not isinstance(checksum, str):
        return False
    values = ''.join(str(transaction_data.get(prop.split('.')[-1], '')) for prop in properties)
    expected = hashlib.sha256(f'{values}{timestamp}{secret}'.encode()).hexdigest()
    return hmac.compare_digest(expected, checksum.lower())


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def crear_pago(request):
    public_key = config('WOMPI_PUBLIC_KEY', default='').strip()
    integrity_secret = config('WOMPI_INTEGRITY_SECRET', default='').strip()
    if not public_key or not integrity_secret or 'xxxxxxxx' in public_key.lower():
        return Response(
            {'detail': 'Wompi no está configurado. Define WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET en backend/.env y reinicia Django.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    reserva_id = request.data.get('reserva_id')
    tipo = str(request.data.get('tipo', 'ANTICIPO')).upper()
    if tipo not in {'ANTICIPO', 'TOTAL'}:
        return Response({'detail': 'Tipo de pago inválido.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        reserva_id = int(reserva_id)
        if reserva_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'detail': 'Identificador de reserva inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            reserva = Reserva.objects.select_for_update().prefetch_related('servicios_contratados').get(
                id=reserva_id, usuario_id=request.user.id
            )
            if reserva.status_id not in [5, 6, 8]:
                return Response({'detail': 'La reserva debe estar confirmada para pagar.'}, status=status.HTTP_400_BAD_REQUEST)

            total = _total_reserva(reserva)
            monto_reservado = sum(
                (
                    pago.monto
                    for pago in Pago.objects.filter(
                        reserva_id=reserva.id,
                        estado__in=['APPROVED', 'PENDIENTE'],
                    )
                ),
                Decimal('0'),
            )
            monto = _monto_a_cobrar(tipo, total, monto_reservado)
            if monto <= 0:
                return Response(
                    {'detail': 'La reserva ya está pagada o tiene pagos pendientes por confirmar.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            referencia = f'TOPHER-{reserva.id}-{secrets.token_hex(5).upper()}'
            pago = Pago.objects.create(
                reserva_id=reserva.id,
                usuario_id=request.user.id,
                referencia=referencia,
                tipo=tipo,
                monto=monto,
                checkout_url=_checkout_url(referencia, monto, public_key, integrity_secret),
            )
    except Reserva.DoesNotExist:
        return Response({'detail': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PagoSerializer(pago).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pagos_reserva(request, reserva_id):
    pagos = Pago.objects.filter(reserva_id=reserva_id, usuario_id=request.user.id)
    return Response(PagoSerializer(pagos, many=True).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def wompi_webhook(request):
    data = request.data
    if not isinstance(data, dict) or data.get('event') != 'transaction.updated':
        return Response({'detail': 'Formato de evento inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    transaction_container = data.get('data')
    if not isinstance(transaction_container, dict):
        return Response({'detail': 'Evento sin transacción.'}, status=status.HTTP_400_BAD_REQUEST)
    transaction_data = transaction_container.get('transaction')
    if not isinstance(transaction_data, dict):
        return Response({'detail': 'Evento sin transacción.'}, status=status.HTTP_400_BAD_REQUEST)

    referencia = transaction_data.get('reference')
    if not referencia:
        return Response({'detail': 'Evento sin referencia.'}, status=status.HTTP_400_BAD_REQUEST)

    signature = data.get('signature', {})
    if not isinstance(signature, dict):
        return Response({'detail': 'Firma inválida.'}, status=status.HTTP_400_BAD_REQUEST)
    properties = signature.get('properties', [])
    if not isinstance(properties, list) or not properties or any(not isinstance(prop, str) for prop in properties):
        return Response({'detail': 'Propiedades de firma inválidas.'}, status=status.HTTP_400_BAD_REQUEST)
    if not {'transaction.id', 'transaction.status', 'transaction.amount_in_cents'}.issubset(properties):
        return Response({'detail': 'La firma no protege los datos necesarios de la transacción.'}, status=status.HTTP_400_BAD_REQUEST)

    timestamp = data.get('timestamp')
    if not isinstance(timestamp, (str, int)) or not str(timestamp).isdigit():
        return Response({'detail': 'Marca de tiempo inválida.'}, status=status.HTTP_400_BAD_REQUEST)
    events_secret = config('WOMPI_EVENTS_SECRET', default='').strip()
    if not events_secret:
        return Response({'detail': 'El secreto de eventos de Wompi no está configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if not _checksum_evento_valido(
        transaction_data,
        properties,
        timestamp,
        signature.get('checksum'),
        events_secret,
    ):
        return Response({'detail': 'Firma inválida.'}, status=status.HTTP_401_UNAUTHORIZED)

    nuevo_estado = transaction_data.get('status')
    if nuevo_estado not in dict(Pago.ESTADOS):
        return Response({'detail': 'Estado de transacción inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    transaction_id = transaction_data.get('id')
    if not transaction_id:
        return Response({'detail': 'Evento sin identificador de transacción.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        monto_en_centavos = int(transaction_data['amount_in_cents'])
        monto_reportado = (Decimal(monto_en_centavos) / 100).quantize(Decimal('0.01'))
    except (KeyError, TypeError, ValueError):
        return Response({'detail': 'Monto de transacción inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    pago = Pago.objects.filter(referencia=referencia).first()
    if not pago:
        return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if transaction_data.get('currency') != pago.moneda or monto_reportado != pago.monto:
        return Response({'detail': 'El monto o moneda de la transacción no coincide con el pago.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        pago = Pago.objects.select_for_update().get(pk=pago.pk)
        if pago.estado in {'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'}:
            return Response({'ok': True})
        pago.estado = nuevo_estado
        pago.wompi_transaction_id = transaction_id
        pago.save(update_fields=['estado', 'wompi_transaction_id', 'actualizado_en'])
    return Response({'ok': True})
