import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from usuarios.models import Usuario

username = os.getenv('DJANGO_ADMIN_USERNAME', 'admin')
email = os.getenv('DJANGO_ADMIN_EMAIL', 'admin@topher.com')
password = os.getenv('DJANGO_ADMIN_PASSWORD')

if not password:
    raise ValueError('DJANGO_ADMIN_PASSWORD no está definido. Defínelo en el entorno o en el archivo .env local antes de ejecutar este script.')

user = Usuario.objects.filter(nombre_usuario=username).first()
if not user:
    Usuario.objects.create_superuser(
        nombre_usuario=username,
        correo=email,
        password=password,
        nombre_completo='Administrador Topher'
    )
    print(f"Superusuario '{username}' creado exitosamente.")
else:
    user.set_password(password)
    user.correo = email
    user.save(update_fields=['password', 'correo'])
    print(f"El usuario '{username}' ya existía y se actualizó la contraseña.")
