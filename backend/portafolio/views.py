from rest_framework import viewsets, permissions
from .models import PortafolioEvento, PortafolioMedia
from .serializers import PortafolioEventoSerializer, PortafolioMediaSerializer

class PortafolioEventoViewSet(viewsets.ModelViewSet):
    queryset = PortafolioEvento.objects.all().order_by('-fecha_evento')
    serializer_class = PortafolioEventoSerializer

    def get_queryset(self):
        queryset = PortafolioEvento.objects.all().order_by('-fecha_evento')
        if self.request.user.is_authenticated and self.request.user.role_id == 1:
            return queryset
        return queryset.filter(activo=True)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class PortafolioMediaViewSet(viewsets.ModelViewSet):
    queryset = PortafolioMedia.objects.all()
    serializer_class = PortafolioMediaSerializer
    permission_classes = [permissions.IsAdminUser]
