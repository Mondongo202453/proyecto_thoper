from rest_framework import serializers
from .models import Personal, StaffAssignment

class PersonalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personal
        fields = '__all__'

class StaffAssignmentSerializer(serializers.ModelSerializer):
    personal_nombre = serializers.ReadOnlyField(source='personal.nombre')
    reserva_numero = serializers.ReadOnlyField(source='reserva.numero_solicitud')

    class Meta:
        model = StaffAssignment
        fields = '__all__'
