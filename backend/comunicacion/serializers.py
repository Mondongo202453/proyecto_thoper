from rest_framework import serializers
from .models import Notificacion, ContactoMensaje

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'

class ContactoMensajeSerializer(serializers.ModelSerializer):
    correo_remitente = serializers.EmailField(max_length=150)
    mensaje = serializers.CharField(max_length=5000)

    class Meta:
        model = ContactoMensaje
        fields = (
            'id',
            'usuario',
            'nombre_remitente',
            'correo_remitente',
            'asunto',
            'mensaje',
            'leido',
            'recibido_en',
        )
        read_only_fields = ('id', 'usuario', 'leido', 'recibido_en')


class ContactoMensajeReadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactoMensaje
        fields = ('leido',)
