from rest_framework import serializers
from .models import Pago


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'
        read_only_fields = (
            'usuario_id', 'reserva_id', 'referencia', 'monto', 'moneda', 'estado',
            'wompi_transaction_id', 'checkout_url', 'creado_en', 'actualizado_en',
        )
