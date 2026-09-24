from django.urls import path
from .views import crear_pago, pagos_reserva, wompi_webhook

urlpatterns = [
    path('pagos/crear/', crear_pago, name='crear-pago'),
    path('pagos/reserva/<int:reserva_id>/', pagos_reserva, name='pagos-reserva'),
    path('pagos/wompi/webhook/', wompi_webhook, name='wompi-webhook'),
]
