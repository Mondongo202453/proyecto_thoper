from rest_framework import serializers
from .models import PortafolioEvento, PortafolioMedia

class PortafolioMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortafolioMedia
        fields = '__all__'

class PortafolioEventoSerializer(serializers.ModelSerializer):
    multimedia = PortafolioMediaSerializer(many=True, read_only=True)

    class Meta:
        model = PortafolioEvento
        fields = '__all__'
