import logging
import smtplib

from django.conf import settings
from django.core.mail import BadHeaderError, send_mail
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from .models import Notificacion, ContactoMensaje
from .serializers import (
    NotificacionSerializer,
    ContactoMensajeReadStatusSerializer,
    ContactoMensajeSerializer,
)

logger = logging.getLogger(__name__)


def enviar_respuesta_por_correo(mensaje, respuesta):
    return send_mail(
        f'Respuesta a tu mensaje — {mensaje.asunto}',
        respuesta,
        settings.DEFAULT_FROM_EMAIL,
        [mensaje.correo_remitente],
        fail_silently=False,
    ) == 1


class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'head', 'options']
    
    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

class ContactoMensajeViewSet(viewsets.ModelViewSet):
    queryset = ContactoMensaje.objects.all()
    serializer_class = ContactoMensajeSerializer
    throttle_scope = 'contacto'

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return ContactoMensajeReadStatusSerializer
        return super().get_serializer_class()

    def get_throttles(self):
        if self.action == 'create':
            return [ScopedRateThrottle()]
        return []
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def perform_create(self, serializer):
        mensaje = serializer.save(
            usuario=self.request.user if self.request.user.is_authenticated else None
        )
        administradores = self._administradores()
        Notificacion.objects.bulk_create([
            Notificacion(
                usuario=administrador,
                tipo='sistema',
                asunto=f'Nuevo mensaje de contacto — {mensaje.asunto}',
                mensaje=(
                    f'{mensaje.nombre_remitente} envió un mensaje: '
                    f'{mensaje.mensaje[:180]}'
                ),
            )
            for administrador in administradores
        ])

    def _administradores(self):
        from usuarios.models import Usuario
        return Usuario.objects.filter(role_id=1)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def responder(self, request, pk=None):
        mensaje = self.get_object()
        respuesta = str(request.data.get('mensaje', '')).strip()
        if not respuesta:
            return Response({'detail': 'Escribe una respuesta antes de enviarla.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(respuesta) > 5000:
            return Response(
                {'detail': 'La respuesta no puede superar los 5000 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mensaje.usuario_id:
            Notificacion.objects.create(
                usuario=mensaje.usuario,
                tipo='sistema',
                asunto=f'Respuesta a tu mensaje — {mensaje.asunto}',
                mensaje=respuesta,
            )
            detail = 'Respuesta enviada al cliente mediante una notificación interna.'
        else:
            try:
                sent = enviar_respuesta_por_correo(mensaje, respuesta)
            except (BadHeaderError, OSError, smtplib.SMTPException):
                logger.exception('No se pudo enviar la respuesta del mensaje de contacto.')
                return Response(
                    {'detail': 'No se pudo enviar la respuesta por correo. Verifica la configuración de correo.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            if not sent:
                logger.error('El servidor de correo no aceptó la respuesta del mensaje de contacto.')
                return Response(
                    {'detail': 'El servidor de correo no aceptó la respuesta. Intenta de nuevo más tarde.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            detail = 'Respuesta enviada por correo al remitente.'

        return Response({'detail': detail}, status=status.HTTP_201_CREATED)
