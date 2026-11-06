from datetime import date, time, timedelta
from decimal import Decimal
from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from reservas.serializers import ReservaSerializer

from reservas.views import (
    calcular_precio_servicio,
    hay_conflicto_horario,
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
            unidad = 'hora'

        precio = calcular_precio_servicio(DummyTarifa(), 2, 3)
        self.assertEqual(precio, 1680000.00)

    def test_tarifa_por_show_no_se_multiplica_por_duracion(self):
        tarifa = SimpleNamespace(precio_unitario=150000, unidad='show')
        self.assertEqual(calcular_precio_servicio(tarifa, 2, 3), Decimal('300000'))

    def test_tarifa_por_unidad_no_se_multiplica_por_duracion(self):
        tarifa = SimpleNamespace(precio_unitario=170000, unidad='unidad')
        self.assertEqual(calcular_precio_servicio(tarifa, 2, 3), Decimal('340000'))

    def test_crear_reserva_convierte_duracion_del_evento(self):
        request = SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, role_id=2),
            data={'servicios_contratados': [
                {'servicio': 1, 'tarifa': 2, 'cantidad': 2},
            ]},
        )
        reserva = SimpleNamespace(id=1)

        with (
            patch('reservas.serializers.Status.objects.get'),
            patch('reservas.serializers.Status.objects.select_for_update'),
            patch('reservas.serializers.Reserva.objects.filter') as reservas_filter,
            patch('reservas.serializers.Reserva.objects.create', return_value=reserva),
            patch('reservas.serializers.ReservationService.objects.create') as crear_servicio,
            patch(
                'reservas.serializers.Tarifa.objects.get',
                return_value=SimpleNamespace(precio_unitario=Decimal('100'), unidad='hora'),
            ),
            patch('reservas.serializers.Usuario.objects.filter', return_value=[]),
            patch('reservas.serializers.transaction.atomic', return_value=nullcontext()),
            patch('reservas.serializers.reservas_activas_en_fecha', return_value=[]),
            patch('reservas.serializers.hay_conflicto_horario', return_value=False),
            patch('documentos.utils.generar_pdf_reserva', side_effect=RuntimeError('PDF desactivado')),
        ):
            reservas_filter.return_value.count.return_value = 0
            serializer = ReservaSerializer(context={'request': request})
            resultado = serializer.create({
                'fecha_evento': date(2099, 1, 1),
                'hora_evento': time(12, 0),
                'duracion_evento': 3,
            })

        self.assertIs(resultado, reserva)
        crear_servicio.assert_called_once_with(
            reserva=reserva,
            servicio_id=1,
            tarifa_id=2,
            cantidad=2,
            duracion_horas=Decimal('3'),
            precio_calculado=Decimal('600'),
            notas='',
        )

    def test_horario_se_solapa_con_una_reserva_activa(self):
        reserva = self._make_reserva(
            fecha_evento=date(2026, 11, 20),
            hora_evento=time(18, 0),
        )
        reserva.servicios_contratados = SimpleNamespace(
            all=lambda: [SimpleNamespace(duracion_horas=2)]
        )

        self.assertTrue(hay_conflicto_horario(
            date(2026, 11, 20), time(19, 30), 1, [reserva]
        ))

    def test_horarios_contiguos_son_disponibles(self):
        reserva = self._make_reserva(
            fecha_evento=date(2026, 11, 20),
            hora_evento=time(18, 0),
        )
        reserva.servicios_contratados = SimpleNamespace(
            all=lambda: [SimpleNamespace(duracion_horas=2)]
        )

        self.assertFalse(hay_conflicto_horario(
            date(2026, 11, 20), time(20, 0), 2, [reserva]
        ))

    def test_disponibilidad_publica_solo_expone_intervalos_ocupados(self):
        client = APIClient()
        with patch('reservas.views.reservas_activas_en_fecha', return_value=[]):
            response = client.get('/api/reservas/disponibilidad/', {
                'fecha': '2026-11-20',
                'hora': '19:00',
                'duracion': '2',
            })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['disponible'])
        self.assertEqual(response.data['horarios_ocupados'], [])
        self.assertNotIn('lugar', response.data)

    def test_disponibilidad_rechaza_duraciones_no_permitidas(self):
        client = APIClient()
        with patch('reservas.views.reservas_activas_en_fecha', return_value=[]):
            response = client.get('/api/reservas/disponibilidad/', {
                'fecha': '2026-11-20',
                'hora': '19:00',
                'duracion': '4',
            })

        self.assertEqual(response.status_code, 400)

    def test_disponibilidad_bloquea_solapamiento_con_reserva_de_la_noche_anterior(self):
        reserva = self._make_reserva(
            fecha_evento=date(2026, 11, 19),
            hora_evento=time(23, 0),
        )
        reserva.servicios_contratados = SimpleNamespace(
            all=lambda: [SimpleNamespace(duracion_horas=2)]
        )
        client = APIClient()

        with patch('reservas.views.reservas_activas_en_fecha', return_value=[reserva]):
            response = client.get('/api/reservas/disponibilidad/', {
                'fecha': '2026-11-20',
                'hora': '00:30',
                'duracion': '1',
            })

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['disponible'])
        self.assertEqual(response.data['horarios_ocupados'][0]['inicio_minutos'], -60)
        self.assertEqual(response.data['horarios_ocupados'][0]['fin_minutos'], 60)

    def test_disponibilidad_bloquea_reserva_que_empieza_despues_de_medianoche(self):
        reserva = self._make_reserva(
            fecha_evento=date(2026, 11, 21),
            hora_evento=time(0, 30),
        )
        reserva.servicios_contratados = SimpleNamespace(
            all=lambda: [SimpleNamespace(duracion_horas=1)]
        )
        client = APIClient()

        with patch('reservas.views.reservas_activas_en_fecha', return_value=[reserva]):
            response = client.get('/api/reservas/disponibilidad/', {
                'fecha': '2026-11-20',
                'hora': '23:30',
                'duracion': '2',
            })

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['disponible'])
        self.assertEqual(response.data['horarios_ocupados'][0]['inicio_minutos'], 1470)
        self.assertEqual(response.data['horarios_ocupados'][0]['fin_minutos'], 1530)
        self.assertEqual(response.data['horarios_ocupados'][0]['inicio_dia_offset'], 1)
        self.assertEqual(response.data['horarios_ocupados'][0]['fin_dia_offset'], 1)
