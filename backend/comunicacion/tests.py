from types import SimpleNamespace
from unittest import TestCase

from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.throttling import ScopedRateThrottle

from .serializers import ContactoMensajeSerializer
from .views import ContactoMensajeViewSet


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
