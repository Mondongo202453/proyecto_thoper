import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
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
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True, min_length=8)
    telefono = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = ('nombre_completo', 'nombre_usuario', 'correo', 'password', 'confirm_password', 'telefono')

    def validate_nombre_completo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre completo es obligatorio.')
        if len(value) < 4:
            raise serializers.ValidationError('El nombre completo debe tener al menos 4 caracteres.')
        return value

    def validate_nombre_usuario(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre de usuario es obligatorio.')
        if ' ' in value:
            raise serializers.ValidationError('El nombre de usuario no debe contener espacios.')
        if len(value) < 4:
            raise serializers.ValidationError('El nombre de usuario debe tener al menos 4 caracteres.')
        return value

    def validate_correo(self, value):
        value = value.strip().lower()
        if Usuario.objects.filter(correo__iexact=value).exists():
            raise serializers.ValidationError('El correo ya está en uso.')
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('La contraseña debe tener al menos 8 caracteres.')
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError('La contraseña debe incluir al menos una letra mayúscula.')
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError('La contraseña debe incluir al menos una letra minúscula.')
        if not re.search(r'\d', value):
            raise serializers.ValidationError('La contraseña debe incluir al menos un número.')
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError('La contraseña debe incluir al menos un carácter especial.')
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_telefono(self, value):
        if value:
            value = value.strip()
            if not value:
                return value
            validator = RegexValidator(regex=r'^[0-9+\- ]+$')
            try:
                validator(value)
            except DjangoValidationError:
                raise serializers.ValidationError('El teléfono solo puede contener números, espacios, + y -.')
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError('Las contraseñas no coinciden.')
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        validated_data.setdefault('role_id', 2)
        validated_data.setdefault('status_id', 1)
        user = Usuario.objects.create_user(**validated_data)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    correo = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    nueva_password = serializers.CharField(min_length=8, write_only=True)
