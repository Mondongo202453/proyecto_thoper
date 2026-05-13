from rest_framework import viewsets
from .models import Usuario, Role, Status
from .serializers import UsuarioSerializer, RoleSerializer, StatusSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer
    
class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all().order_by('id')
    serializer_class = StatusSerializer
    
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('id')
    serializer_class = UsuarioSerializer

