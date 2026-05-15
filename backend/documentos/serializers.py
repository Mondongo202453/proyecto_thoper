from rest_framework import serializers
from .models import Cotizacion

class CotizacionSerializer(serializers.ModelSerializer):
    reserva_numero = serializers.ReadOnlyField(source='reserva.numero_solicitud')

    class Meta:
        model = Cotizacion
        fields = '__all__'
