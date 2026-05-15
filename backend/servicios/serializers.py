from rest_framework import serializers
from .models import Servicio, Tarifa, ServicioImagen

class TarifaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarifa
        fields = '__all__'

class ServicioImagenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioImagen
        fields = '__all__'

class ServicioSerializer(serializers.ModelSerializer):
    tarifas = TarifaSerializer(many=True, read_only=True)
    imagenes = ServicioImagenSerializer(many=True, read_only=True)

    class Meta:
        model = Servicio
        fields = '__all__'
