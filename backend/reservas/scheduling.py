import datetime
from decimal import Decimal

from .models import Reserva


ESTADOS_ACTIVOS = [4, 5, 6]
HORAS_EVENTO_PERMITIDAS = (1, 2, 3)


def duracion_reserva_horas(reserva):
    duraciones = [
        Decimal(str(item.duracion_horas or 0))
        for item in reserva.servicios_contratados.all()
    ]
    return max(duraciones, default=Decimal('3'))


def hay_conflicto_horario(fecha, hora, duracion_horas, reservas):
    inicio = datetime.datetime.combine(fecha, hora)
    fin = inicio + datetime.timedelta(hours=float(duracion_horas))
    for reserva in reservas:
        inicio_reserva = datetime.datetime.combine(reserva.fecha_evento, reserva.hora_evento)
        fin_reserva = inicio_reserva + datetime.timedelta(hours=float(duracion_reserva_horas(reserva)))
        if inicio < fin_reserva and fin > inicio_reserva:
            return True
    return False


def reservas_activas_en_fecha(fecha, exclude_id=None, for_update=False):
    reservas = Reserva.objects.filter(
        fecha_evento__gte=fecha - datetime.timedelta(days=1),
        fecha_evento__lte=fecha + datetime.timedelta(days=1),
        status_id__in=ESTADOS_ACTIVOS,
    ).prefetch_related('servicios_contratados')
    if exclude_id is not None:
        reservas = reservas.exclude(id=exclude_id)
    if for_update:
        reservas = reservas.select_for_update()
    return reservas
