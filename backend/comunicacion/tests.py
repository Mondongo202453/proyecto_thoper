from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle

from .serializers import ContactoMensajeReadStatusSerializer, ContactoMensajeSerializer
from .views import ContactoMensajeViewSet, enviar_respuesta_por_correo


class ContactoMensajeSerializerTests(TestCase):
    def test_contact_fields_cannot_be_set_by_public_submissions(self):
        serializer = ContactoMensajeSerializer(data={
            'usuario': 99,
            'nombre_remitente': 'Cliente de prueba',
            'correo_remitente': 'cliente@example.com',
            'asunto': 'Consulta',
            'mensaje': 'Quisiera recibir información.',
            'leido': True,
            'recibido_en': '2026-01-01T00:00:00Z',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn('usuario', serializer.validated_data)
        self.assertNotIn('leido', serializer.validated_data)
        self.assertNotIn('recibido_en', serializer.validated_data)

    def test_invalid_contact_email_is_rejected(self):
        serializer = ContactoMensajeSerializer(data={
            'nombre_remitente': 'Cliente de prueba',
            'correo_remitente': 'no-es-un-correo',
            'asunto': 'Consulta',
            'mensaje': 'Quisiera recibir información.',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('correo_remitente', serializer.errors)

    def test_contact_message_has_a_maximum_length(self):
        serializer = ContactoMensajeSerializer(data={
            'nombre_remitente': 'Cliente de prueba',
            'correo_remitente': 'cliente@example.com',
            'asunto': 'Consulta',
            'mensaje': 'x' * 5001,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('mensaje', serializer.errors)

    def test_admin_can_update_message_read_status(self):
        serializer = ContactoMensajeReadStatusSerializer(data={'leido': True})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data, {'leido': True})

    def test_read_status_update_does_not_accept_other_fields(self):
        serializer = ContactoMensajeReadStatusSerializer(data={
            'leido': True,
            'asunto': 'Asunto alterado',
            'mensaje': 'Mensaje alterado',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data, {'leido': True})


class ContactoMensajeViewSetTests(TestCase):
    def test_public_create_is_rate_limited(self):
        view = ContactoMensajeViewSet()
        view.action = 'create'
        throttle = view.get_throttles()[0]
        throttle.scope = view.throttle_scope
        throttle.num_requests, throttle.duration = throttle.parse_rate(throttle.get_rate())

        self.assertIsInstance(throttle, ScopedRateThrottle)
        self.assertEqual(view.throttle_scope, 'contacto')
        self.assertEqual((throttle.num_requests, throttle.duration), (10, 3600))

    def test_admin_actions_do_not_use_public_contact_throttle(self):
        view = ContactoMensajeViewSet()
        view.action = 'list'

        self.assertEqual(view.get_throttles(), [])

    def test_contact_submission_permissions_are_unchanged(self):
        view = ContactoMensajeViewSet()
        view.action = 'create'
        self.assertIsInstance(view.get_permissions()[0], AllowAny)

        view.action = 'list'
        permission = view.get_permissions()[0]
        self.assertIsInstance(permission, IsAdminUser)
        self.assertFalse(permission.has_permission(
            SimpleNamespace(user=SimpleNamespace(is_staff=False)),
            view,
        ))

    def test_message_updates_use_the_read_status_serializer(self):
        for action in ('update', 'partial_update'):
            with self.subTest(action=action):
                view = ContactoMensajeViewSet()
                view.action = action
                self.assertIs(view.get_serializer_class(), ContactoMensajeReadStatusSerializer)


class ContactReplyEmailTests(TestCase):
    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_guest_reply_is_delivered_to_the_sender_without_real_email(self):
        message = SimpleNamespace(
            asunto='Consulta de prueba',
            correo_remitente='visitante@example.invalid',
        )

        sent = enviar_respuesta_por_correo(message, 'Respuesta de prueba.')

        self.assertTrue(sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['visitante@example.invalid'])
        self.assertEqual(mail.outbox[0].subject, 'Respuesta a tu mensaje — Consulta de prueba')
        self.assertEqual(mail.outbox[0].body, 'Respuesta de prueba.')

    @patch('comunicacion.views.send_mail', return_value=0)
    def test_email_failure_is_reported_as_not_sent(self, send_mail_mock):
        message = SimpleNamespace(
            asunto='Consulta de prueba',
            correo_remitente='visitante@example.invalid',
        )

        self.assertFalse(enviar_respuesta_por_correo(message, 'Respuesta de prueba.'))
        send_mail_mock.assert_called_once()
