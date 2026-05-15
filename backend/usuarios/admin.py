from django.contrib import admin
from .models import Usuario, Role, Status

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('nombre_usuario', 'correo', 'nombre_completo', 'role', 'creado_en')
    search_fields = ('nombre_usuario', 'correo', 'nombre_completo')
    list_filter = ('role', 'status')

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')

@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo', 'categoria')
