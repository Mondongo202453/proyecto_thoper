from rest_framework import viewsets, permissions
from .models import PortafolioEvento, PortafolioMedia
from .serializers import PortafolioEventoSerializer, PortafolioMediaSerializer

class PortafolioEventoViewSet(viewsets.ModelViewSet):
    queryset = PortafolioEvento.objects.filter(activo=True).order_by('-fecha_evento')
    serializer_class = PortafolioEventoSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class PortafolioMediaViewSet(viewsets.ModelViewSet):
    queryset = PortafolioMedia.objects.all()
    serializer_class = PortafolioMediaSerializer
    permission_classes = [permissions.IsAdminUser]
