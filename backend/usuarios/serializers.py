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
    role_nombre = serializers.ReadOnlyField(source='role.nombre')
    status_nombre = serializers.ReadOnlyField(source='status.nombre')

    class Meta:
        model = Usuario
        fields = (
            'id', 'nombre_completo', 'nombre_usuario', 'correo', 
            'telefono', 'role', 'role_nombre', 'status', 'status_nombre', 
            'intentos_fallidos', 'bloqueado_hasta', 'ultimo_login', 
            'creado_en', 'actualizado_en'
        )
        read_only_fields = ('creado_en', 'actualizado_en', 'ultimo_login', 'intentos_fallidos', 'bloqueado_hasta')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Usuario
        fields = ('nombre_completo', 'nombre_usuario', 'correo', 'password', 'telefono')

    def create(self, validated_data):
        # Default role: usuario (ID 2), Default status: activo (ID 1)
        validated_data.setdefault('role_id', 2)
        validated_data.setdefault('status_id', 1)
        user = Usuario.objects.create_user(**validated_data)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    correo = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    nueva_password = serializers.CharField(min_length=8, write_only=True)
