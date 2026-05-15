from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class Role(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'
        managed = False

    def __str__(self):
        return self.nombre


class Status(models.Model):
    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=100)
    categoria = models.CharField(max_length=50)
    color = models.CharField(max_length=20, default='#6B7280')
    icono = models.CharField(max_length=50, default='circle')

    class Meta:
        db_table = 'statuses'
        managed = False

    def __str__(self):
        return self.nombre


class UsuarioManager(BaseUserManager):
    def create_user(self, nombre_usuario, correo, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo es obligatorio')
        correo = self.normalize_email(correo)
        user = self.model(nombre_usuario=nombre_usuario, correo=correo, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, nombre_usuario, correo, password=None, **extra_fields):
        extra_fields.setdefault('role_id', 1)  # Admin role
        extra_fields.setdefault('status_id', 1)  # Active status
        return self.create_user(nombre_usuario, correo, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    nombre_completo = models.CharField(max_length=150)
    nombre_usuario = models.CharField(max_length=80, unique=True)
    correo = models.EmailField(max_length=150, unique=True)
    password = models.CharField(max_length=255, db_column='hash_contrasena')
    telefono = models.CharField(max_length=20, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, db_column='role_id', related_name='usuarios_set')
    status = models.ForeignKey(Status, on_delete=models.PROTECT, db_column='status_id', related_name='usuarios_set')
    intentos_fallidos = models.PositiveSmallIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True, db_column='ultimo_login')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'nombre_usuario'
    REQUIRED_FIELDS = ['correo', 'nombre_completo']

    @property
    def is_staff(self):
        return self.role_id in [1, 3]  # Admin or Staff

    @property
    def is_superuser(self):
        return self.role_id == 1  # Admin only

    @property
    def is_active(self):
        return self.status_id == 1  # Active

    class Meta:
        db_table = 'usuarios'
        managed = False

    def __str__(self):
        return self.nombre_completo


class ResetToken(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='reset_tokens', db_column='usuario_id')
    token = models.CharField(max_length=255, unique=True)
    expira_en = models.DateTimeField()
    usado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reset_tokens'
        managed = False

    def __str__(self):
        return f"Token for {self.usuario.nombre_usuario}"
