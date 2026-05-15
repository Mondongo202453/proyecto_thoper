from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from .models import Usuario, Role, Status
from .serializers import UsuarioSerializer, RoleSerializer, StatusSerializer, RegisterSerializer

class RegisterView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAdminUser]
    
class StatusViewSet(viewsets.ModelViewSet):
    queryset = Status.objects.all().order_by('id')
    serializer_class = StatusSerializer
    permission_classes = [permissions.IsAdminUser]
    
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('id')
    serializer_class = UsuarioSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

