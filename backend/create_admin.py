import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from usuarios.models import Usuario

username = 'admin'
email = 'admin@topher.com'
password = 'topher_admin_2026'

if not Usuario.objects.filter(nombre_usuario=username).exists():
    Usuario.objects.create_superuser(
        nombre_usuario=username,
        correo=email,
        password=password,
        nombre_completo='Administrador Topher'
    )
    print(f"Superusuario '{username}' creado exitosamente.")
else:
    print(f"El usuario '{username}' ya existe.")
