from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from .models import Usuario

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None
        
        try:
            # Buscar por correo o nombre_usuario (insensible a mayúsculas)
            user = Usuario.objects.get(Q(nombre_usuario__iexact=username) | Q(correo__iexact=username))
        except Usuario.DoesNotExist:
            # Ejecutar set_password para evitar timing attacks
            Usuario().set_password(password)
            return None
        except Usuario.MultipleObjectsReturned:
            user = Usuario.objects.filter(Q(nombre_usuario__iexact=username) | Q(correo__iexact=username)).first()
            
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
