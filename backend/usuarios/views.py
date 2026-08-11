from rest_framework import viewsets, generics, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import authenticate
import uuid
import datetime

from .models import Usuario, Role, Status, ResetToken
from .serializers import (
    UsuarioSerializer, RoleSerializer, StatusSerializer,
    RegisterSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)


# ─────────────────────────────────────────────────────────
# Login personalizado con protección de fuerza bruta (RN05)
# ─────────────────────────────────────────────────────────
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Determinar si es correo o username
        identifier = attrs.get(self.username_field, '').strip()
        usuario = None
        try:
            if '@' in identifier:
                usuario = Usuario.objects.get(correo__iexact=identifier)
            else:
                usuario = Usuario.objects.get(nombre_usuario__iexact=identifier)
        except Usuario.DoesNotExist:
            # Evitar timing attacks
            Usuario().set_password(attrs.get('password'))
            raise serializers.ValidationError('Credenciales inválidas.')

        # Verificar bloqueo (RN05)
        if usuario.bloqueado_hasta and usuario.bloqueado_hasta > timezone.now():
            raise serializers.ValidationError('Credenciales inválidas.')

        # Autenticar
        from django.contrib.auth import authenticate
        user_auth = authenticate(
            request=self.context.get('request'),
            username=usuario.nombre_usuario,
            password=attrs.get('password')
        )

        if user_auth is None:
            usuario.intentos_fallidos += 1
            max_intentos = getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5)
            lockout_min = getattr(settings, 'LOGIN_LOCKOUT_MINUTES', 15)

            if usuario.intentos_fallidos >= max_intentos:
                usuario.bloqueado_hasta = timezone.now() + datetime.timedelta(minutes=lockout_min)
                usuario.intentos_fallidos = 0
                usuario.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])
            else:
                usuario.save(update_fields=['intentos_fallidos'])

            raise serializers.ValidationError('Credenciales inválidas.')

        # Login exitoso — resetear intentos
        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        usuario.last_login = timezone.now()
        usuario.save(update_fields=['intentos_fallidos', 'bloqueado_hasta', 'last_login'])

        # Forzar username para el serializador base
        attrs[self.username_field] = usuario.nombre_usuario
        data = super().validate(attrs)

        # Agregar datos extra al token response
        data['user'] = {
            'id': usuario.id,
            'nombre_completo': usuario.nombre_completo,
            'nombre_usuario': usuario.nombre_usuario,
            'correo': usuario.correo,
            'role_id': usuario.role_id,
            'role_nombre': usuario.role.nombre,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────
# Registro
# ─────────────────────────────────────────────────────────
class RegisterView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer


# ─────────────────────────────────────────────────────────
# Perfil propio /api/me/ (RF: endpoint de perfil)
# ─────────────────────────────────────────────────────────
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        # Solo campos editables por el usuario
        allowed_fields = {'nombre_completo', 'telefono'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UsuarioSerializer(request.user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────
# Reset de contraseña (RF04, RN07)
# ─────────────────────────────────────────────────────────
class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        correo = request.data.get('correo', '').strip()
        if not correo:
            return Response({'detail': 'Correo es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = Usuario.objects.get(correo=correo)
        except Usuario.DoesNotExist:
            # Por seguridad, siempre respondemos igual
            return Response({'detail': 'Si el correo existe, recibirás un enlace de recuperación.'})

        # Invalidar tokens anteriores
        ResetToken.objects.filter(usuario=usuario, usado=False).update(usado=True)

        token_str = str(uuid.uuid4())
        expira_en = timezone.now() + datetime.timedelta(minutes=30)
        ResetToken.objects.create(usuario=usuario, token=token_str, expira_en=expira_en)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password?token={token_str}"

        send_mail(
            subject='Recuperación de contraseña — Topher Producciones',
            message=f"""Hola {usuario.nombre_completo},\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n{reset_url}\n\nEste enlace expira en 30 minutos y solo puede usarse una vez.\n\nSi no solicitaste este cambio, ignora este correo.\n\nEquipo Topher Producciones.""",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[correo],
            fail_silently=True,
        )

        return Response({'detail': 'Si el correo existe, recibirás un enlace de recuperación.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token', '').strip()
        nueva_password = request.data.get('nueva_password', '').strip()

        if not token_str or not nueva_password:
            return Response({'detail': 'Token y nueva contraseña son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(nueva_password) < 8:
            return Response({'detail': 'La contraseña debe tener al menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reset_token = ResetToken.objects.get(token=token_str, usado=False)
        except ResetToken.DoesNotExist:
            return Response({'detail': 'Token inválido o ya utilizado.'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_token.expira_en < timezone.now():
            return Response({'detail': 'El enlace de recuperación ha expirado. Solicita uno nuevo.'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = reset_token.usuario
        usuario.set_password(nueva_password)
        usuario.intentos_fallidos = 0
        usuario.bloqueado_hasta = None
        usuario.save()

        reset_token.usado = True
        reset_token.save()

        return Response({'detail': 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'})


# ─────────────────────────────────────────────────────────
# ViewSets de administración
# ─────────────────────────────────────────────────────────
class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAdminUser]


class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all().order_by('id')
    serializer_class = StatusSerializer
    permission_classes = [permissions.IsAdminUser]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('id')
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.action in ['list', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        """RN03: No eliminar usuario con reservas activas"""
        usuario = self.get_object()
        estados_activos = [4, 5, 6]  # Pendiente, Confirmada, En Proceso (IDs del catálogo)
        from reservas.models import Reserva
        reservas_activas = Reserva.objects.filter(
            usuario=usuario,
            status_id__in=[4, 5, 6]
        ).exists()
        if reservas_activas:
            return Response(
                {'detail': 'No se puede eliminar un usuario con reservas activas (Pendiente, Confirmada o En Proceso).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def toggle_estado(self, request, pk=None):
        """Activar/desactivar usuario (RF05)"""
        usuario = self.get_object()
        # status_id 1 = Activo, 2 = Inactivo (según topher_db.sql)
        if usuario.status_id == 1:
            usuario.status_id = 2  # Inactivo
            mensaje = 'Usuario desactivado correctamente.'
        else:
            usuario.status_id = 1  # Activo
            mensaje = 'Usuario activado correctamente.'
        usuario.save(update_fields=['status_id'])
        return Response({'detail': mensaje, 'status_id': usuario.status_id})
