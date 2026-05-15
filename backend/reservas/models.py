from django.db import models
from django.conf import settings
from usuarios.models import Status
from servicios.models import Servicio, Tarifa

class Reserva(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas', db_column='usuario_id')
    numero_solicitud = models.CharField(max_length=20, unique=True)
    nombre_evento = models.CharField(max_length=200)
    fecha_evento = models.DateField()
    hora_evento = models.TimeField()
    lugar = models.CharField(max_length=200)
    municipio = models.CharField(max_length=100)
    asistentes = models.PositiveIntegerField(default=0)
    observaciones = models.TextField(null=True, blank=True)
    notas_internas = models.TextField(null=True, blank=True)
    status = models.ForeignKey(Status, on_delete=models.PROTECT, db_column='status_id', related_name='reservas_set')
    cancelado_en = models.DateTimeField(null=True, blank=True)
    motivo_cancelacion = models.TextField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reservas'
        managed = False

    def __str__(self):
        return f"Reserva {self.numero_solicitud} - {self.nombre_evento}"


class ReservationService(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='servicios_contratados', db_column='reserva_id')
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT, db_column='servicio_id')
    tarifa = models.ForeignKey(Tarifa, on_delete=models.PROTECT, db_column='tarifa_id')
    cantidad = models.PositiveIntegerField(default=1)
    duracion_horas = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    precio_calculado = models.DecimalField(max_digits=12, decimal_places=2)
    notas = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        db_table = 'reservation_services'
        managed = False

    def __str__(self):
        return f"{self.servicio.nombre} para {self.reserva.numero_solicitud}"


class StatusHistory(models.Model):
    entity_type = models.CharField(max_length=50)
    entity_id = models.PositiveBigIntegerField()
    status_anterior = models.ForeignKey(Status, on_delete=models.SET_NULL, null=True, blank=True, db_column='status_anterior', related_name='historial_anterior')
    status_nuevo = models.ForeignKey(Status, on_delete=models.CASCADE, db_column='status_nuevo', related_name='historial_nuevo')
    cambiado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='cambiado_por')
    timestamp_cambio = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'status_history'
        managed = False

    def __str__(self):
        return f"Cambio en {self.entity_type} ID {self.entity_id}"
