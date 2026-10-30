from smtplib import SMTPException
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from reservas.models import Reserva

from .models import Personal, StaffAssignment
from .views import StaffAssignmentViewSet


class StaffAssignmentEmailTests(TestCase):
    def setUp(self):
        self.personal = SimpleNamespace(
            nombre='Personal de prueba',
            correo='personal@example.invalid',
        )
        self.reserva = SimpleNamespace(
            nombre_evento='Evento de prueba',
            fecha_evento='2026-12-01',
            hora_evento='18:00',
            lugar='Lugar de prueba',
            municipio='Puerto Boyacá',
        )
        self.assignment = SimpleNamespace(rol_en_evento='Producción')

    def test_assignment_email_reports_success(self):
        with (
            patch.object(Personal.objects, 'get', return_value=self.personal),
            patch.object(Reserva.objects, 'get', return_value=self.reserva),
            patch.object(StaffAssignment.objects, 'get', return_value=self.assignment),
            patch('personal.views.send_mail', return_value=1) as send_mail,
        ):
            sent = StaffAssignmentViewSet()._notificar_personal_asignado(1, 2)

        self.assertTrue(sent)
        self.assertEqual(send_mail.call_args.kwargs['recipient_list'], [self.personal.correo])
        self.assertFalse(send_mail.call_args.kwargs['fail_silently'])

    def test_assignment_email_reports_delivery_failure(self):
        with (
            patch.object(Personal.objects, 'get', return_value=self.personal),
            patch.object(Reserva.objects, 'get', return_value=self.reserva),
            patch.object(StaffAssignment.objects, 'get', return_value=self.assignment),
            patch('personal.views.send_mail', side_effect=SMTPException('SMTP unavailable')),
            patch('personal.views.logger.exception') as log_exception,
        ):
            sent = StaffAssignmentViewSet()._notificar_personal_asignado(1, 2)

        self.assertFalse(sent)
        log_exception.assert_called_once()
