from datetime import date, time, timedelta
from django.test import SimpleTestCase
from django.utils import timezone

from reservas.views import (
    calcular_precio_servicio,
    validar_cancelacion_reserva,
    validar_conflicto_asignacion,
)


class ReservaBusinessRulesTests(SimpleTestCase):
    def _make_reserva(self, status_id=4, fecha_evento=None, hora_evento=None):
        class DummyReserva:
            pass

        reserva = DummyReserva()
        reserva.status_id = status_id
        reserva.fecha_evento = fecha_evento or (date.today() + timedelta(days=10))
        reserva.hora_evento = hora_evento or time(20, 0)
        reserva.usuario_id = 7
        return reserva

    def _make_user(self, role_id=2):
        class DummyUser:
            pass

        user = DummyUser()
        user.role_id = role_id
        user.id = 7
        return user

    def test_cancelacion_permitida_con_mas_de_72_horas(self):
        reserva = self._make_reserva(status_id=4)
        user = self._make_user(role_id=2)
        permitido, mensaje = validar_cancelacion_reserva(reserva, user, now=timezone.now())
        self.assertTrue(permitido)
        self.assertIsNone(mensaje)

    def test_cancelacion_denegada_si_falta_menos_de_72_horas(self):
        reserva = self._make_reserva(status_id=4, fecha_evento=date.today() + timedelta(days=1), hora_evento=time(10, 0))
        user = self._make_user(role_id=2)
        permitido, mensaje = validar_cancelacion_reserva(reserva, user, now=timezone.now())
        self.assertFalse(permitido)
        self.assertIn('72', mensaje)

    def test_conflicto_de_asignacion_por_fecha_y_hora(self):
        class DummyQueryset:
            def __init__(self, exists):
                self._exists = exists

            def exists(self):
                return self._exists

        reserva = self._make_reserva(status_id=4)
        conflicto, mensaje = validar_conflicto_asignacion(
            10,
            reserva,
            queryset=DummyQueryset(True)
        )
        self.assertTrue(conflicto)
        self.assertIn('misma fecha y hora', mensaje.lower())

    def test_calculo_de_precio_por_item(self):
        class DummyTarifa:
            precio_unitario = 280000.00

        precio = calcular_precio_servicio(DummyTarifa(), 2, 3)
        self.assertEqual(precio, 1680000.00)
