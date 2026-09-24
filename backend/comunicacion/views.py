from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notificacion, ContactoMensaje
from .serializers import NotificacionSerializer, ContactoMensajeSerializer

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
        if not mensaje.usuario_id:
            return Response(
                {'detail': 'Este mensaje fue enviado sin una cuenta asociada y no permite respuesta interna.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        Notificacion.objects.create(
            usuario=mensaje.usuario,
            tipo='sistema',
            asunto=f'Respuesta a tu mensaje — {mensaje.asunto}',
            mensaje=respuesta,
        )
        return Response({'detail': 'Respuesta enviada al cliente.'}, status=status.HTTP_201_CREATED)
