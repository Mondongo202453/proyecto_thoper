from rest_framework import viewsets, permissions
from .models import Notificacion, ContactoMensaje
from .serializers import NotificacionSerializer, ContactoMensajeSerializer

class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    
    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

class ContactoMensajeViewSet(viewsets.ModelViewSet):
    queryset = ContactoMensaje.objects.all()
    serializer_class = ContactoMensajeSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]
