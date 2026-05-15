from django.contrib import admin
from .models import Servicio, Tarifa, ServicioImagen

class TarifaInline(admin.TabularInline):
    model = Tarifa
    extra = 1

class ImagenInline(admin.TabularInline):
    model = ServicioImagen
    extra = 1

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')
    inlines = [TarifaInline, ImagenInline]

@admin.register(Tarifa)
class TarifaAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'unidad', 'precio_unitario')
    list_filter = ('unidad',)

@admin.register(ServicioImagen)
class ServicioImagenAdmin(admin.ModelAdmin):
    list_display = ('servicio', 'url_imagen', 'es_principal')
