from django.db import models

class PortafolioEvento(models.Model):
    nombre = models.CharField(max_length=200)
    fecha_evento = models.DateField()
    lugar = models.CharField(max_length=200)
    descripcion = models.TextField(null=True, blank=True)
    tipo_evento = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'portafolio_eventos'
        managed = False

    def __str__(self):
        return self.nombre


class PortafolioMedia(models.Model):
    TIPOS = [
        ('foto', 'Foto'),
        ('video', 'Video'),
    ]
    portafolio_evento = models.ForeignKey(PortafolioEvento, on_delete=models.CASCADE, related_name='multimedia', db_column='portafolio_evento_id')
    tipo = models.CharField(max_length=10, choices=TIPOS, default='foto')
    url_archivo = models.CharField(max_length=500)
    thumbnail_url = models.CharField(max_length=500, null=True, blank=True)
    es_principal = models.BooleanField(default=False)
    orden = models.PositiveIntegerField(default=0)
    titulo = models.CharField(max_length=200, null=True, blank=True)
    subido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'portafolio_media'
        managed = False

    def __str__(self):
        return f"{self.tipo.capitalize()} de {self.portafolio_evento.nombre}"
