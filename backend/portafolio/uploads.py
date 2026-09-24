import os
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView


class MediaUploadView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'Selecciona un archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        tipos_permitidos = {
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime',
        }
        if archivo.content_type not in tipos_permitidos:
            return Response({'detail': 'Solo se permiten imágenes JPG, PNG, WEBP, GIF o videos MP4, WEBM y MOV.'}, status=status.HTTP_400_BAD_REQUEST)
        limite = 100 * 1024 * 1024 if archivo.content_type.startswith('video/') else 8 * 1024 * 1024
        if archivo.size > limite:
            limite_mb = 100 if archivo.content_type.startswith('video/') else 8
            return Response({'detail': f'El archivo supera el máximo de {limite_mb} MB permitido.'}, status=status.HTTP_400_BAD_REQUEST)

        extension = os.path.splitext(archivo.name)[1].lower()
        nombre = f'uploads/{uuid.uuid4().hex}{extension}'
        ruta = default_storage.save(nombre, archivo)
        return Response({'url': f'{settings.MEDIA_URL}{ruta}'}, status=status.HTTP_201_CREATED)
