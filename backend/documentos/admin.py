from django.contrib import admin
from .models import Cotizacion

@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = ('reserva', 'tipo', 'monto_total', 'generado_en', 'url_pdf')
    list_filter = ('tipo', 'generado_en')
    readonly_fields = ('generado_en',)
