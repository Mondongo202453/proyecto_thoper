from django.urls import path
from .views import (
    configuracion_pagos,
    crear_pago,
    pagos_reserva,
    simular_pago,
    wompi_webhook,
)

urlpatterns = [
    path('pagos/configuracion/', configuracion_pagos, name='configuracion-pagos'),
    path('pagos/crear/', crear_pago, name='crear-pago'),
    path('pagos/<int:pago_id>/simular/', simular_pago, name='simular-pago'),
    path('pagos/reserva/<int:reserva_id>/', pagos_reserva, name='pagos-reserva'),
    path('pagos/wompi/webhook/', wompi_webhook, name='wompi-webhook'),
]
