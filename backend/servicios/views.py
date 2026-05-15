from rest_framework import viewsets, permissions
from .models import Servicio, Tarifa, ServicioImagen
from .serializers import ServicioSerializer, TarifaSerializer, ServicioImagenSerializer

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all().order_by('id')
    serializer_class = ServicioSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

class TarifaViewSet(viewsets.ModelViewSet):
    queryset = Tarifa.objects.all().order_by('id')
    serializer_class = TarifaSerializer
    permission_classes = [permissions.IsAdminUser]

class ServicioImagenViewSet(viewsets.ModelViewSet):
    queryset = ServicioImagen.objects.all().order_by('id')
    serializer_class = ServicioImagenSerializer
    permission_classes = [permissions.IsAdminUser]
