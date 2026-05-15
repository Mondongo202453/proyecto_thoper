from rest_framework import viewsets, permissions
from .models import Reserva, ReservationService
from .serializers import ReservaSerializer, ReservationServiceSerializer

class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all().order_by('-creado_en')
    serializer_class = ReservaSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1: # Admin
            return Reserva.objects.all()
        return Reserva.objects.filter(usuario=user)

class ReservationServiceViewSet(viewsets.ModelViewSet):
    queryset = ReservationService.objects.all()
    serializer_class = ReservationServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1: # Admin
            return ReservationService.objects.all()
        return ReservationService.objects.filter(reserva__usuario=user)
