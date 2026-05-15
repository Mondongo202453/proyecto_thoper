from django.contrib import admin
from .models import PortafolioEvento, PortafolioMedia

class MediaInline(admin.TabularInline):
    model = PortafolioMedia
    extra = 1

@admin.register(PortafolioEvento)
class PortafolioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo_evento', 'fecha_evento', 'activo')
    list_filter = ('tipo_evento', 'activo')
    search_fields = ('nombre', 'descripcion', 'lugar')
    inlines = [MediaInline]

@admin.register(PortafolioMedia)
class PortafolioMediaAdmin(admin.ModelAdmin):
    list_display = ('portafolio_evento', 'tipo', 'es_principal')
