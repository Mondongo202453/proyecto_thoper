from rest_framework import serializers
from django.utils import timezone
from .models import Usuario, Role, Status


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ('creado_en',)


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    creado_en = serializers.DateTimeField(required=False)
    actualizado_en = serializers.DateTimeField(required=False)

    class Meta:
        model = Usuario
        fields = '__all__'

    def validate_nombre_completo(self, value):
        if not value.strip():
            raise serializers.ValidationError("El nombre completo es obligatorio.")
        return value

    def validate_nombre_usuario(self, value):
        if not value.strip():
            raise serializers.ValidationError("El nombre de usuario es obligatorio.")
        return value

    def validate_hash_contrasena(self, value):
        if not value.strip():
            raise serializers.ValidationError("La contraseña es obligatoria.")
        return value

    def create(self, validated_data):
        now = timezone.now()
        validated_data.setdefault('creado_en', now)
        validated_data.setdefault('actualizado_en', now)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['actualizado_en'] = timezone.now()
        return super().update(instance, validated_data)
