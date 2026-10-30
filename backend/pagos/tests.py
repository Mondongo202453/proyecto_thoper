import hashlib
import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import ANY, MagicMock, patch

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from pagos.views import (
    _checksum_evento_valido,
    _monto_a_cobrar,
    configuracion_pagos,
    crear_pago,
    resumen_ingresos,
    simular_pago,
    wompi_webhook,
)


class PaymentCalculationTests(SimpleTestCase):
    def test_anticipo_uses_half_of_total(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('0')),
            Decimal('50000.00'),
        )

    def test_anticipo_never_exceeds_remaining_balance(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('80000')),
            Decimal('20000'),
        )

    def test_total_payment_uses_remaining_balance(self):
        self.assertEqual(
            _monto_a_cobrar('TOTAL', Decimal('100000'), Decimal('25000')),
            Decimal('75000'),
        )

    def test_fully_paid_or_reserved_balance_has_no_new_payment(self):
        self.assertEqual(
            _monto_a_cobrar('ANTICIPO', Decimal('100000'), Decimal('100000')),
            Decimal('0.00'),
        )


class WompiEventSignatureTests(SimpleTestCase):
    def test_accepts_uppercase_wompi_checksum(self):
        transaction_data = {
            'id': 'transaction-1',
            'status': 'APPROVED',
            'amount_in_cents': 10000,
        }
        properties = [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
        ]
        timestamp = 1234567890
        secret = 'events-secret'
        checksum_input = f'transaction-1APPROVED10000{timestamp}{secret}'
        checksum = hashlib.sha256(checksum_input.encode()).hexdigest().upper()

        self.assertTrue(
            _checksum_evento_valido(
                transaction_data,
                properties,
                timestamp,
                checksum,
                secret,
            )
        )


class RevenueSummaryTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_admin_gets_last_twelve_months_and_only_approved_payments(self):
        fecha_referencia = datetime.date(2026, 10, 29)
        servicios_manager = MagicMock()
        servicios_qs = MagicMock()
        servicios_manager.exclude.return_value = servicios_qs
        servicios_qs.filter.return_value = servicios_qs
        servicios_qs.aggregate.return_value = {'mes_2026_10': Decimal('350000.00')}

        pagos_manager = MagicMock()
        pagos_qs = MagicMock()
        pagos_manager.filter.return_value = pagos_qs
        pagos_qs.filter.return_value = pagos_qs
        pagos_qs.aggregate.return_value = {'mes_2026_10': Decimal('175000.00')}
        admin = SimpleNamespace(is_authenticated=True, is_staff=True)
        request = self.factory.get('/api/pagos/resumen-ingresos/')
        force_authenticate(request, user=admin)

        with (
            patch('pagos.views.timezone.localdate', return_value=fecha_referencia),
            patch('pagos.views.ReservationService.objects', servicios_manager),
            patch('pagos.views.Pago.objects', pagos_manager),
        ):
            response = resumen_ingresos(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['desde'], '2025-11')
        self.assertEqual(response.data['hasta'], '2026-10')
        self.assertEqual(len(response.data['datos']), 12)
        self.assertEqual(response.data['datos'][-1], {
            'mes': '2026-10',
            'valor_reservas': '350000.00',
            'pagos_aprobados': '175000.00',
        })
        pagos_manager.filter.assert_called_once_with(estado='APPROVED')
        pagos_qs.filter.assert_called_once_with(
            actualizado_en__gte=ANY,
            actualizado_en__lt=ANY,
        )
        servicios_manager.exclude.assert_called_once_with(reserva__status_id=7)

    def test_non_admin_cannot_read_revenue_summary(self):
        user = SimpleNamespace(is_authenticated=True, is_staff=False)
        request = self.factory.get('/api/pagos/resumen-ingresos/')
        force_authenticate(request, user=user)

        with patch('pagos.views.Pago.objects') as pagos_manager:
            response = resumen_ingresos(request)

        self.assertEqual(response.status_code, 403)
        pagos_manager.filter.assert_not_called()


class LocalPaymentSimulationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(id=7, is_authenticated=True)

    def authenticated_post(self, view, path, payload, *view_args):
        request = self.factory.post(path, payload, format='json')
        force_authenticate(request, user=self.user)
        return view(request, *view_args)

    @override_settings(DEBUG=True, PAYMENT_MODE='mock')
    def test_payment_configuration_reports_no_charge_local_mode(self):
        request = self.factory.get('/api/pagos/configuracion/')
        force_authenticate(request, user=self.user)

        response = configuracion_pagos(request)

        self.assertEqual(response.data, {
            'modo': 'mock',
            'habilitado': True,
            'simulacion_local': True,
        })

    @override_settings(DEBUG=True, PAYMENT_MODE='mock')
    def test_creating_local_payment_does_not_create_wompi_checkout(self):
        reserva = SimpleNamespace(
            id=22,
            status_id=5,
            servicios_contratados=MagicMock(),
        )
        reserva.servicios_contratados.all.return_value = [
            SimpleNamespace(precio_calculado=Decimal('100000.00')),
        ]
        reserva_manager = MagicMock()
        reserva_manager.select_for_update.return_value.prefetch_related.return_value.get.return_value = reserva
        pago_manager = MagicMock()
        pago_manager.filter.return_value.filter.return_value.exists.return_value = False
        pago = SimpleNamespace()
        pago_manager.create.return_value = pago
        serializer = MagicMock()
        serializer.data = {'id': 5, 'modo': 'SIMULADO', 'checkout_url': ''}

        with (
            patch('pagos.views.Reserva.objects', reserva_manager),
            patch('pagos.views.Pago.objects', pago_manager),
            patch('pagos.views.PagoSerializer', return_value=serializer),
            patch('pagos.views._checkout_url') as checkout_url,
            patch('pagos.views.transaction.atomic'),
        ):
            response = self.authenticated_post(
                crear_pago,
                '/api/pagos/crear/',
                {'reserva_id': 22, 'tipo': 'ANTICIPO'},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['modo'], 'SIMULADO')
        self.assertEqual(response.data['checkout_url'], '')
        self.assertEqual(pago_manager.create.call_args.kwargs['monto'], Decimal('50000.00'))
        self.assertEqual(pago_manager.create.call_args.kwargs['modo'], 'SIMULADO')
        checkout_url.assert_not_called()

    @override_settings(DEBUG=True, PAYMENT_MODE='mock')
    def test_creating_payment_is_blocked_while_another_is_pending(self):
        reserva = SimpleNamespace(id=22, status_id=5)
        reserva_manager = MagicMock()
        reserva_manager.select_for_update.return_value.prefetch_related.return_value.get.return_value = reserva
        pago_manager = MagicMock()
        pago_manager.filter.return_value.filter.return_value.exists.return_value = True

        with (
            patch('pagos.views.Reserva.objects', reserva_manager),
            patch('pagos.views.Pago.objects', pago_manager),
            patch('pagos.views.transaction.atomic'),
        ):
            response = self.authenticated_post(
                crear_pago,
                '/api/pagos/crear/',
                {'reserva_id': 22, 'tipo': 'TOTAL'},
            )

        self.assertEqual(response.status_code, 409)
        pago_manager.create.assert_not_called()

    @override_settings(DEBUG=True, PAYMENT_MODE='mock')
    def test_simulating_payment_updates_only_local_pending_payment(self):
        pago = SimpleNamespace(
            id=5,
            usuario_id=self.user.id,
            modo='SIMULADO',
            estado='PENDIENTE',
            save=MagicMock(),
        )
        pago_manager = MagicMock()
        pago_manager.select_for_update.return_value.get.return_value = pago
        serializer = MagicMock()
        serializer.data = {'id': 5, 'modo': 'SIMULADO', 'estado': 'APPROVED'}

        with (
            patch('pagos.views.Pago.objects', pago_manager),
            patch('pagos.views.PagoSerializer', return_value=serializer),
            patch('pagos.views.transaction.atomic'),
        ):
            response = self.authenticated_post(
                simular_pago,
                '/api/pagos/5/simular/',
                {'estado': 'APPROVED'},
                5,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(pago.estado, 'APPROVED')
        pago.save.assert_called_once_with(update_fields=['estado', 'actualizado_en'])

    @override_settings(DEBUG=False, PAYMENT_MODE='disabled')
    def test_local_simulation_is_unavailable_outside_development(self):
        pago_manager = MagicMock()

        with patch('pagos.views.Pago.objects', pago_manager):
            response = self.authenticated_post(
                simular_pago,
                '/api/pagos/5/simular/',
                {'estado': 'APPROVED'},
                5,
            )

        self.assertEqual(response.status_code, 404)
        pago_manager.select_for_update.assert_not_called()

    @override_settings(DEBUG=True, PAYMENT_MODE='mock')
    def test_wompi_webhook_is_disabled_in_local_simulation_mode(self):
        request = self.factory.post('/api/pagos/wompi/webhook/', {}, format='json')

        response = wompi_webhook(request)

        self.assertEqual(response.status_code, 503)
