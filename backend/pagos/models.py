from django.db import models


class Pago(models.Model):
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('APPROVED', 'Aprobado'),
        ('DECLINED', 'Rechazado'),
        ('VOIDED', 'Anulado'),
        ('ERROR', 'Error'),
    ]
    TIPOS = [('ANTICIPO', 'Anticipo'), ('TOTAL', 'Total')]

    reserva_id = models.PositiveBigIntegerField(db_column='reserva_id')
    usuario_id = models.PositiveBigIntegerField(db_column='usuario_id')
    referencia = models.CharField(max_length=80, unique=True)
    tipo = models.CharField(max_length=10, choices=TIPOS)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=3, default='COP')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    wompi_transaction_id = models.CharField(max_length=120, blank=True, null=True)
    checkout_url = models.URLField(max_length=1000, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagos'
        ordering = ['-creado_en']
