from rest_framework import viewsets, permissions
from .models import Cotizacion
from .serializers import CotizacionSerializer

class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1: # Admin
            return Cotizacion.objects.all()
        return Cotizacion.objects.filter(reserva__usuario=user)
