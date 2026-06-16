from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Servicio, Tarifa, ServicioImagen
from .serializers import ServicioSerializer, TarifaSerializer, ServicioImagenSerializer


class ServicioViewSet(viewsets.ModelViewSet):
    serializer_class = ServicioSerializer

    def get_queryset(self):
        qs = Servicio.objects.prefetch_related('tarifas', 'imagenes').order_by('id')
        # RF10: Filtrar por categoría
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria__iexact=categoria)
        disponible = self.request.query_params.get('disponible')
        if disponible is not None:
            qs = qs.filter(disponible=disponible.lower() == 'true')
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def destroy(self, request, *args, **kwargs):
        """RN02: No eliminar servicio con reservas activas"""
        servicio = self.get_object()
        from reservas.models import ReservationService
        tiene_reservas_activas = ReservationService.objects.filter(
            servicio=servicio,
            reserva__status_id__in=[4, 5, 6]  # Pendiente, Confirmada, En Proceso
        ).exists()
        if tiene_reservas_activas:
            return Response(
                {'detail': 'Este servicio tiene reservas asociadas (Pendiente, Confirmada o En Proceso). No puede ser eliminado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class TarifaViewSet(viewsets.ModelViewSet):
    queryset = Tarifa.objects.all().order_by('id')
    serializer_class = TarifaSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = Tarifa.objects.all().order_by('id')
        servicio_id = self.request.query_params.get('servicio_id')
        if servicio_id:
            qs = qs.filter(servicio_id=servicio_id)
        activa = self.request.query_params.get('activa')
        if activa is not None:
            qs = qs.filter(activa=activa.lower() == 'true')
        return qs


class ServicioImagenViewSet(viewsets.ModelViewSet):
    queryset = ServicioImagen.objects.all().order_by('orden')
    serializer_class = ServicioImagenSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = ServicioImagen.objects.all().order_by('orden')
        servicio_id = self.request.query_params.get('servicio_id')
        if servicio_id:
            qs = qs.filter(servicio_id=servicio_id)
        return qs
