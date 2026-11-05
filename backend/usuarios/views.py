import datetime
import hashlib
import logging
import secrets
from smtplib import SMTPException

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ImproperlyConfigured, ValidationError as DjangoValidationError
from django.core.mail import BadHeaderError, EmailMultiAlternatives
from django.db import transaction
from django.db.models import Q
from django.template import TemplateDoesNotExist, TemplateSyntaxError
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario, Role, Status, ResetToken
from .serializers import (
    UsuarioSerializer, RoleSerializer, StatusSerializer,
    RegisterSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)

logger = logging.getLogger(__name__)


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
            raise AuthenticationFailed('Credenciales inválidas.')

        # Verificar bloqueo (RN05)
        if usuario.bloqueado_hasta and usuario.bloqueado_hasta > timezone.now():
            raise AuthenticationFailed('Credenciales inválidas.')

        # Autenticar
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

            raise AuthenticationFailed('Credenciales inválidas.')

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
PASSWORD_RESET_TOKEN_MINUTES = 15
PASSWORD_RESET_SENDER = 'thoperproducciones.app@gmail.com'


def _buscar_usuario_para_reset(identificador):
    return Usuario.objects.filter(
        Q(correo__iexact=identificador) | Q(nombre_usuario__iexact=identificador)
    ).first()


def _enmascarar_correo(correo):
    local, separator, domain = correo.partition('@')
    if not separator:
        return '***'
    if len(local) <= 3:
        local_enmascarado = '*' * 3
    else:
        local_enmascarado = f"{local[0]}{'*' * (len(local) - 3)}{local[-2:]}"
    return f'{local_enmascarado}@{domain}'


def _correo_reset_configurado():
    return (
        settings.EMAIL_BACKEND not in {
            'django.core.mail.backends.console.EmailBackend',
            'django.core.mail.backends.locmem.EmailBackend',
        }
        and bool(settings.EMAIL_HOST)
        and settings.EMAIL_HOST_USER.lower() == PASSWORD_RESET_SENDER
        and bool(settings.EMAIL_HOST_PASSWORD)
    )


def _enviar_correo_recuperacion(usuario, token):
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    reset_url = f'{frontend_url}/recuperar-password#token={token}'
    context = {
        'nombre': usuario.nombre_completo,
        'reset_url': reset_url,
        'vigencia_minutos': PASSWORD_RESET_TOKEN_MINUTES,
    }
    texto = render_to_string('emails/password_reset.txt', context)
    html = render_to_string('emails/password_reset.html', context)
    email = EmailMultiAlternatives(
        subject='Recuperación de contraseña - TOPHER.',
        body=texto,
        from_email=PASSWORD_RESET_SENDER,
        to=[usuario.correo],
    )
    email.attach_alternative(html, 'text/html')
    return email.send(fail_silently=False)


class PasswordResetLookupView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_lookup'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        usuario = _buscar_usuario_para_reset(serializer.validated_data['identificador'])
        if not usuario or usuario.status_id != 1:
            return Response(
                {'detail': 'No pudimos identificar una cuenta activa. Vuelve al inicio e intenta de nuevo.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'correo_enmascarado': _enmascarar_correo(usuario.correo)})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        usuario = _buscar_usuario_para_reset(serializer.validated_data['identificador'])
        if not usuario or usuario.status_id != 1:
            return Response(
                {'detail': 'No pudimos identificar una cuenta activa. Vuelve al inicio e intenta de nuevo.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not _correo_reset_configurado():
            logger.error('Password reset email is not configured for SMTP delivery.')
            return Response(
                {'detail': 'El correo de recuperación no está configurado. No se envió ningún mensaje.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        with transaction.atomic():
            usuario = Usuario.objects.select_for_update().get(pk=usuario.pk)
            ResetToken.objects.filter(usuario=usuario, usado=False).update(usado=True)
            reset_token = ResetToken.objects.create(
                usuario=usuario,
                token=token_hash,
                expira_en=timezone.now() + datetime.timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES),
            )

        try:
            sent = _enviar_correo_recuperacion(usuario, token)
            if sent != 1:
                raise OSError('SMTP backend did not confirm delivery.')
        except (
            BadHeaderError,
            ImproperlyConfigured,
            OSError,
            SMTPException,
            TemplateDoesNotExist,
            TemplateSyntaxError,
            ValueError,
        ):
            logger.exception('Password reset email delivery failed.')
            ResetToken.objects.filter(pk=reset_token.pk, usado=False).update(usado=True)
            return Response(
                {'detail': 'No fue posible enviar el correo de recuperación. Inténtalo nuevamente.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            'detail': f'Enviamos el correo de recuperación a {_enmascarar_correo(usuario.correo)}.',
            'correo_enmascarado': _enmascarar_correo(usuario.correo),
        })


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                token = serializer.validated_data['token']
                tokens = ResetToken.objects.select_for_update().select_related('usuario')
                try:
                    reset_token = tokens.get(
                        token=hashlib.sha256(token.encode('utf-8')).hexdigest(),
                        usado=False,
                    )
                except ResetToken.DoesNotExist:
                    if len(token) != 36:
                        raise
                    reset_token = tokens.get(token=token, usado=False)
                if reset_token.expira_en <= timezone.now():
                    reset_token.usado = True
                    reset_token.save(update_fields=['usado'])
                    return Response(
                        {'detail': 'El enlace de recuperación ya no es válido. Inicia nuevamente el proceso.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                usuario = reset_token.usuario
                try:
                    validate_password(serializer.validated_data['nueva_password'], user=usuario)
                except DjangoValidationError as exc:
                    raise serializers.ValidationError({'nueva_password': exc.messages}) from exc
                usuario.set_password(serializer.validated_data['nueva_password'])
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = None
                usuario.save(update_fields=['password', 'intentos_fallidos', 'bloqueado_hasta'])

                reset_token.usado = True
                reset_token.save(update_fields=['usado'])
                ResetToken.objects.filter(usuario=usuario, usado=False).exclude(pk=reset_token.pk).update(usado=True)
        except ResetToken.DoesNotExist:
            return Response(
                {'detail': 'El enlace de recuperación no es válido o ya fue utilizado. Inicia nuevamente el proceso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

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
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy', 'toggle_estado']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Usuario.objects.all()
        if user.role_id != 1:
            queryset = queryset.filter(pk=user.pk)
        return queryset.order_by('id')

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
