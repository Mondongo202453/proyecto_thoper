import hashlib
import hmac
import secrets
from decimal import Decimal, ROUND_HALF_UP

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


def _checkout_url(referencia, monto):
    public_key = config('WOMPI_PUBLIC_KEY', default='')
    integrity_secret = config('WOMPI_INTEGRITY_SECRET', default='')
    frontend_url = config('FRONTEND_URL', default='http://127.0.0.1:5173')
    amount = int((monto * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    checksum = hashlib.sha256(f'{referencia}{amount}COP{integrity_secret}'.encode()).hexdigest()
    params = (
        f'public-key={public_key}&currency=COP&amount-in-cents={amount}'
        f'&reference={referencia}&signature:integrity={checksum}'
        f'&redirect-url={frontend_url}/mis-reservas'
    )
    return f'https://checkout.wompi.co/p/?{params}'


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def crear_pago(request):
    reserva_id = request.data.get('reserva_id')
    tipo = str(request.data.get('tipo', 'ANTICIPO')).upper()
    if tipo not in {'ANTICIPO', 'TOTAL'}:
        return Response({'detail': 'Tipo de pago inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reserva = Reserva.objects.prefetch_related('servicios_contratados').get(
            id=reserva_id, usuario_id=request.user.id
        )
    except Exception:
        return Response({'detail': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    if reserva.status_id not in [5, 6, 8]:
        return Response({'detail': 'La reserva debe estar confirmada para pagar.'}, status=status.HTTP_400_BAD_REQUEST)

    total = _total_reserva(reserva)
    abonado = sum(
        (p.monto for p in Pago.objects.filter(reserva_id=reserva.id, estado='APPROVED')),
        Decimal('0'),
    )
    monto = total if tipo == 'TOTAL' else (total / 2).quantize(Decimal('0.01'))
    if tipo == 'TOTAL':
        monto -= abonado
    if monto <= 0:
        return Response({'detail': 'Esta reserva ya está pagada completamente.'}, status=status.HTTP_400_BAD_REQUEST)

    referencia = f'TOPHER-{reserva.id}-{secrets.token_hex(5).upper()}'
    pago = Pago.objects.create(
        reserva_id=reserva.id,
        usuario_id=request.user.id,
        referencia=referencia,
        tipo=tipo,
        monto=monto,
        checkout_url=_checkout_url(referencia, monto),
    )
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
    transaction_data = data.get('data', {}).get('transaction', {})
    referencia = transaction_data.get('reference')
    if not referencia:
        return Response({'detail': 'Evento sin referencia.'}, status=status.HTTP_400_BAD_REQUEST)
    pago = Pago.objects.filter(referencia=referencia).first()
    if not pago:
        return Response({'detail': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    signature = data.get('signature', {})
    properties = signature.get('properties', [])
    values = ''.join(str(transaction_data.get(prop.split('.')[-1], '')) for prop in properties)
    timestamp = data.get('timestamp', '')
    expected = hashlib.sha256(f'{values}{timestamp}{config("WOMPI_EVENTS_SECRET", default="")}'.encode()).hexdigest()
    if not hmac.compare_digest(expected, str(signature.get('checksum', ''))):
        return Response({'detail': 'Firma inválida.'}, status=status.HTTP_401_UNAUTHORIZED)

    nuevo_estado = transaction_data.get('status', 'PENDIENTE')
    with transaction.atomic():
        pago.estado = nuevo_estado
        pago.wompi_transaction_id = transaction_data.get('id') or pago.wompi_transaction_id
        pago.save(update_fields=['estado', 'wompi_transaction_id', 'actualizado_en'])
    return Response({'ok': True})
