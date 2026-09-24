import os

from django.conf import settings
from django.http import FileResponse
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Cotizacion
from .serializers import CotizacionSerializer

class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role_id == 1: # Admin
            queryset = Cotizacion.objects.all()
        else:
            queryset = Cotizacion.objects.filter(reserva__usuario=user)

        reserva_id = self.request.query_params.get('reserva')
        if reserva_id:
            queryset = queryset.filter(reserva_id=reserva_id)
        return queryset.order_by('-generado_en')

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download(self, request, pk=None):
        """Descarga un PDF únicamente para el dueño de la reserva o un administrador."""
        cotizacion = self.get_object()
        if not cotizacion.url_pdf:
            return Response(
                {'detail': 'Este documento no tiene un archivo PDF asociado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        relative_path = cotizacion.url_pdf.removeprefix('/media/').lstrip('/\\')
        file_path = os.path.abspath(os.path.join(settings.MEDIA_ROOT, relative_path))
        media_root = os.path.abspath(settings.MEDIA_ROOT)
        if os.path.commonpath([file_path, media_root]) != media_root:
            return Response(
                {'detail': 'La ruta del documento no es válida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not os.path.isfile(file_path):
            return Response(
                {'detail': 'El archivo PDF no está disponible en el servidor.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        filename = os.path.basename(file_path)
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=filename,
            content_type='application/pdf',
        )
