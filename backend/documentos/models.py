from django.db import models
from reservas.models import Reserva

class Cotizacion(models.Model):
    TIPOS = [
        ('cotizacion', 'Cotización'),
        ('confirmacion', 'Confirmación'),
        ('servicio_prestado', 'Servicio Prestado'),
    ]
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='documentos', db_column='reserva_id')
    tipo = models.CharField(max_length=20, choices=TIPOS, default='cotizacion')
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    url_pdf = models.CharField(max_length=500, null=True, blank=True)
    enviado_correo = models.BooleanField(default=False)
    generado_en = models.DateTimeField(auto_now_add=True)
    generado_por = models.CharField(max_length=50, default='sistema')

    class Meta:
        db_table = 'cotizaciones'
        managed = False

    def __str__(self):
        return f"{self.tipo.capitalize()} - Reserva {self.reserva.numero_solicitud}"
