from django.db import models


class Role(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    creado_en = models.DateTimeField()

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


class Usuario(models.Model):
    nombre_completo = models.CharField(max_length=150)
    nombre_usuario = models.CharField(max_length=80, unique=True)
    correo = models.EmailField(max_length=150, unique=True)
    hash_contrasena = models.CharField(max_length=255)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, db_column='role_id', related_name='usuarios')
    status = models.ForeignKey(Status, on_delete=models.PROTECT, db_column='status_id', related_name='usuarios')
    intentos_fallidos = models.PositiveSmallIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)
    ultimo_login = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField()
    actualizado_en = models.DateTimeField()

    class Meta:
        db_table = 'usuarios'
        managed = False

    def __str__(self):
        return self.nombre_completo
