from rest_framework import serializers
from .models import Notificacion, ContactoMensaje

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'

class ContactoMensajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactoMensaje
        fields = '__all__'
