from django.db import models
from django.conf import settings
from reservas.models import Reserva

class Notificacion(models.Model):
    TIPOS = [
        ('correo', 'Correo Electrónico'),
        ('sistema', 'Notificación de Sistema'),
    ]
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificaciones', db_column='usuario_id')
    reserva = models.ForeignKey(Reserva, on_delete=models.SET_NULL, null=True, blank=True, db_column='reserva_id')
    tipo = models.CharField(max_length=20, choices=TIPOS, default='sistema')
    asunto = models.CharField(max_length=200)
    mensaje = models.TextField()
    leido = models.BooleanField(default=False)
    enviado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificaciones'
        managed = False

    def __str__(self):
        return f"{self.asunto} para {self.usuario.nombre_usuario}"


class ContactoMensaje(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, db_column='usuario_id')
    nombre_remitente = models.CharField(max_length=150)
    correo_remitente = models.CharField(max_length=150)
    asunto = models.CharField(max_length=200)
    mensaje = models.TextField()
    leido = models.BooleanField(default=False)
    recibido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contacto_mensajes'
        managed = False

    def __str__(self):
        return f"Mensaje de {self.nombre_remitente}: {self.asunto}"
