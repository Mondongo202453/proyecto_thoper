from django.db import models

class Servicio(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=80)
    caracteristicas_tecnicas = models.TextField(null=True, blank=True)
    disponible = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'servicios'
        managed = False

    def __str__(self):
        return self.nombre


class Tarifa(models.Model):
    UNIDADES = [
        ('hora', 'Hora'),
        ('unidad', 'Unidad'),
        ('show', 'Show'),
    ]
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='tarifas', db_column='servicio_id')
    unidad = models.CharField(max_length=20, choices=UNIDADES)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    cantidad_minima = models.PositiveIntegerField(default=1)
    activa = models.BooleanField(default=True)
    vigente_desde = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'tarifas'
        managed = False

    def __str__(self):
        return f"{self.servicio.nombre} - {self.unidad}: ${self.precio_unitario}"


class ServicioImagen(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='imagenes', db_column='servicio_id')
    url_imagen = models.CharField(max_length=500)
    es_principal = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    alt_text = models.CharField(max_length=200, null=True, blank=True)
    subido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'servicio_imagenes'
        managed = False

    def __str__(self):
        return f"Imagen de {self.servicio.nombre}"
