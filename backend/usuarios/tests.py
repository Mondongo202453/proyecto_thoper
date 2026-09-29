from django.test import SimpleTestCase

from usuarios.serializers import PasswordResetConfirmSerializer, PasswordResetRequestSerializer


class PasswordResetSerializerTests(SimpleTestCase):
    def test_request_normalizes_email(self):
        serializer = PasswordResetRequestSerializer(data={'correo': '  CLIENTE@example.com  '})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['correo'], 'cliente@example.com')

    def test_confirm_requires_a_strong_password(self):
        serializer = PasswordResetConfirmSerializer(data={
            'token': 'valid-token',
            'nueva_password': 'weakpassword',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('nueva_password', serializer.errors)

    def test_confirm_preserves_password_whitespace(self):
        password = ' StrongPass123! '
        serializer = PasswordResetConfirmSerializer(data={
            'token': 'valid-token',
            'nueva_password': password,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['nueva_password'], password)
