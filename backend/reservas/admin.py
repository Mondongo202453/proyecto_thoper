from django.contrib import admin
from .models import Reserva, ReservationService

class ReservationServiceInline(admin.TabularInline):
    model = ReservationService
    extra = 0
    readonly_fields = ('precio_calculado',)

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('numero_solicitud', 'usuario', 'nombre_evento', 'fecha_evento', 'status')
    list_filter = ('status', 'fecha_evento')
    search_fields = ('numero_solicitud', 'nombre_evento', 'usuario__nombre_usuario')
    inlines = [ReservationServiceInline]
