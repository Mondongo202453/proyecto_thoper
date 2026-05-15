from django.db import models
from django.conf import settings
from reservas.models import Reserva

class Personal(models.Model):
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, db_column='usuario_id', related_name='perfil_personal')
    nombre = models.CharField(max_length=150)
    correo = models.EmailField(max_length=150, unique=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    especialidad = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'personal'
        managed = False

    def __str__(self):
        return f"{self.nombre} ({self.especialidad})"


class StaffAssignment(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='asignaciones_staff', db_column='reserva_id')
    personal = models.ForeignKey(Personal, on_delete=models.CASCADE, related_name='eventos_asignados', db_column='personal_id')
    rol_en_evento = models.CharField(max_length=100)
    fecha_asignacion = models.DateField()
    confirmado = models.BooleanField(default=False)
    notas = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        db_table = 'staff_assignments'
        managed = False
        unique_together = (('reserva', 'personal'),)

    def __str__(self):
        return f"{self.personal.nombre} en {self.reserva.numero_solicitud}"
