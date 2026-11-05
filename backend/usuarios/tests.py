import hashlib
from contextlib import nullcontext
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.test import APIRequestFactory

from usuarios.models import ResetToken, Usuario
from usuarios.serializers import PasswordResetConfirmSerializer, PasswordResetRequestSerializer
from usuarios.views import (
    PasswordResetConfirmView,
    PasswordResetLookupView,
    PasswordResetRequestView,
    UsuarioViewSet,
    _enmascarar_correo,
    _enviar_correo_recuperacion,
)


class PasswordResetSerializerTests(SimpleTestCase):
    def test_request_normalizes_email_identifier(self):
        serializer = PasswordResetRequestSerializer(data={'identificador': '  CLIENTE@example.com  '})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['identificador'], 'cliente@example.com')

    def test_request_trims_username_identifier(self):
        serializer = PasswordResetRequestSerializer(data={'identificador': '  Cliente7  '})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['identificador'], 'Cliente7')

    def test_confirm_requires_a_strong_password(self):
        serializer = PasswordResetConfirmSerializer(data={
            'token': 'valid-token',
            'nueva_password': 'weakpassword',
            'confirmar_password': 'weakpassword',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('nueva_password', serializer.errors)

    def test_confirm_preserves_password_whitespace(self):
        password = ' StrongPass123! '
        serializer = PasswordResetConfirmSerializer(data={
            'token': 'valid-token',
            'nueva_password': password,
            'confirmar_password': password,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['nueva_password'], password)

    def test_confirm_rejects_mismatched_passwords(self):
        serializer = PasswordResetConfirmSerializer(data={
            'token': 'valid-token',
            'nueva_password': 'StrongPass123!',
            'confirmar_password': 'DifferentPass123!',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('confirmar_password', serializer.errors)


class PasswordResetFlowTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(
            id=18,
            pk=18,
            status_id=1,
            correo='cliente@example.com',
            nombre_completo='Cliente Ejemplo',
        )

    def post(self, view, path, data):
        request = self.factory.post(path, data, format='json')
        return view.as_view()(request)

    def test_email_mask_preserves_only_a_short_local_part_hint(self):
        self.assertEqual(_enmascarar_correo('elian7@gmail.com'), 'e***n7@gmail.com')
        self.assertEqual(_enmascarar_correo('ab@gmail.com'), '***@gmail.com')

    @patch('usuarios.views.render_to_string', side_effect=['plain body', '<html>email</html>'])
    @patch('usuarios.views.EmailMultiAlternatives')
    @patch('usuarios.views.settings.DEFAULT_FROM_EMAIL', 'thoperproducciones.app@gmail.com')
    def test_recovery_email_uses_configured_sender_database_recipient_and_fragment_token(
        self, email_class, render_template
    ):
        email_class.return_value.send.return_value = 1

        sent = _enviar_correo_recuperacion(self.user, 'secret-link-token')

        self.assertEqual(sent, 1)
        email_class.assert_called_once_with(
            subject='Recuperación de contraseña - TOPHER.',
            body='plain body',
            from_email='thoperproducciones.app@gmail.com',
            to=['cliente@example.com'],
        )
        self.assertEqual(email_class.return_value.send.call_args.kwargs, {'fail_silently': False})
        self.assertEqual(email_class.return_value.attach_alternative.call_args.args, ('<html>email</html>', 'text/html'))
        self.assertIn('#token=secret-link-token', render_template.call_args_list[0].args[1]['reset_url'])

    @patch.object(PasswordResetLookupView, 'throttle_classes', [])
    @patch('usuarios.views.Usuario.objects')
    def test_lookup_returns_only_the_masked_database_email(self, manager):
        manager.filter.return_value.first.return_value = self.user

        response = self.post(
            PasswordResetLookupView,
            '/api/password-reset/lookup/',
            {'identificador': 'Cliente7'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'correo_enmascarado': 'c****te@example.com'})
        manager.filter.assert_called_once()

    @patch('usuarios.views.transaction.atomic', return_value=nullcontext())
    @patch.object(PasswordResetRequestView, 'throttle_classes', [])
    @patch('usuarios.views._enviar_correo_recuperacion', return_value=1)
    @patch('usuarios.views._correo_reset_configurado', return_value=True)
    @patch('usuarios.views._buscar_usuario_para_reset')
    @patch('usuarios.views.ResetToken.objects')
    @patch('usuarios.views.Usuario.objects')
    def test_request_stores_only_a_hash_and_reports_confirmed_delivery(
        self, user_manager, token_manager, lookup, email_configured, send_email, atomic
    ):
        user_manager.select_for_update.return_value.get.return_value = self.user
        lookup.return_value = self.user
        token_manager.create.return_value = SimpleNamespace(pk=42)

        response = self.post(
            PasswordResetRequestView,
            '/api/password-reset/',
            {'identificador': 'Cliente7'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['correo_enmascarado'], 'c****te@example.com')
        raw_token = send_email.call_args.args[1]
        stored_token = token_manager.create.call_args.kwargs['token']
        self.assertEqual(stored_token, hashlib.sha256(raw_token.encode()).hexdigest())
        self.assertNotEqual(stored_token, raw_token)
        self.assertEqual(len(stored_token), 64)
        self.assertAlmostEqual(
            (token_manager.create.call_args.kwargs['expira_en'] - timezone.now()).total_seconds(),
            15 * 60,
            delta=2,
        )

    @patch('usuarios.views.transaction.atomic', return_value=nullcontext())
    @patch.object(PasswordResetRequestView, 'throttle_classes', [])
    @patch('usuarios.views._enviar_correo_recuperacion', side_effect=OSError('SMTP unavailable'))
    @patch('usuarios.views._correo_reset_configurado', return_value=True)
    @patch('usuarios.views._buscar_usuario_para_reset')
    @patch('usuarios.views.ResetToken.objects')
    @patch('usuarios.views.Usuario.objects')
    def test_smtp_failure_invalidates_token_and_returns_failure(
        self, user_manager, token_manager, lookup, email_configured, send_email, atomic
    ):
        user_manager.select_for_update.return_value.get.return_value = self.user
        lookup.return_value = self.user
        token_manager.create.return_value = SimpleNamespace(pk=43)

        response = self.post(
            PasswordResetRequestView,
            '/api/password-reset/',
            {'identificador': 'Cliente7'},
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn('No fue posible enviar', response.data['detail'])
        token_manager.filter.assert_any_call(pk=43, usado=False)
        token_manager.filter.return_value.update.assert_called_with(usado=True)

    @patch.object(PasswordResetRequestView, 'throttle_classes', [])
    @patch('usuarios.views._buscar_usuario_para_reset')
    @patch('usuarios.views._correo_reset_configurado', return_value=False)
    @patch('usuarios.views.ResetToken.objects')
    def test_missing_smtp_configuration_never_claims_success(
        self, token_manager, email_configured, lookup
    ):
        lookup.return_value = self.user

        response = self.post(
            PasswordResetRequestView,
            '/api/password-reset/',
            {'identificador': 'Cliente7'},
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn('No se envió', response.data['detail'])
        token_manager.create.assert_not_called()

    @patch('usuarios.views.transaction.atomic', return_value=nullcontext())
    @patch.object(PasswordResetConfirmView, 'throttle_classes', [])
    @patch('usuarios.views.ResetToken.objects')
    def test_confirm_hashes_token_updates_password_and_consumes_token(self, token_manager, atomic):
        user = Usuario(
            nombre_completo='Cliente Ejemplo',
            nombre_usuario='cliente7',
            correo='cliente@example.com',
            role_id=2,
            status_id=1,
        )
        user.save = MagicMock()
        reset_token = SimpleNamespace(
            pk=44,
            usuario=user,
            expira_en=timezone.now() + timedelta(minutes=5),
            usado=False,
            save=MagicMock(),
        )
        token_manager.select_for_update.return_value.select_related.return_value.get.return_value = reset_token
        raw_token = 'unique-recovery-token'

        response = self.post(
            PasswordResetConfirmView,
            '/api/password-reset/confirm/',
            {
                'token': raw_token,
                'nueva_password': 'StrongPass123!',
                'confirmar_password': 'StrongPass123!',
            },
        )

        self.assertEqual(response.status_code, 200)
        token_manager.select_for_update.return_value.select_related.return_value.get.assert_called_once_with(
            token=hashlib.sha256(raw_token.encode()).hexdigest(),
            usado=False,
        )
        self.assertTrue(user.check_password('StrongPass123!'))
        self.assertTrue(reset_token.usado)
        reset_token.save.assert_called_once_with(update_fields=['usado'])

    @patch('usuarios.views.transaction.atomic', return_value=nullcontext())
    @patch.object(PasswordResetConfirmView, 'throttle_classes', [])
    @patch('usuarios.views.ResetToken.objects')
    def test_expired_token_is_invalidated(self, token_manager, atomic):
        reset_token = SimpleNamespace(
            pk=45,
            usuario=Usuario(),
            expira_en=timezone.now() - timedelta(seconds=1),
            usado=False,
            save=MagicMock(),
        )
        token_manager.select_for_update.return_value.select_related.return_value.get.return_value = reset_token

        response = self.post(
            PasswordResetConfirmView,
            '/api/password-reset/confirm/',
            {
                'token': 'expired-recovery-token',
                'nueva_password': 'StrongPass123!',
                'confirmar_password': 'StrongPass123!',
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(reset_token.usado)
        reset_token.save.assert_called_once_with(update_fields=['usado'])

    @patch('usuarios.views.transaction.atomic', return_value=nullcontext())
    @patch.object(PasswordResetConfirmView, 'throttle_classes', [])
    @patch('usuarios.views.ResetToken.objects')
    def test_consumed_token_cannot_be_used_again(self, token_manager, atomic):
        token_manager.select_for_update.return_value.select_related.return_value.get.side_effect = ResetToken.DoesNotExist

        response = self.post(
            PasswordResetConfirmView,
            '/api/password-reset/confirm/',
            {
                'token': 'already-used-token',
                'nueva_password': 'StrongPass123!',
                'confirmar_password': 'StrongPass123!',
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('ya fue utilizado', response.data['detail'])


class UserRoleAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def make_request(self, role_id):
        request = self.factory.get('/api/usuarios/')
        request.user = SimpleNamespace(
            id=12,
            pk=12,
            role_id=role_id,
            is_authenticated=True,
            is_staff=role_id == 1,
        )
        return request

    def test_only_administrators_are_django_staff(self):
        self.assertTrue(Usuario(role_id=1).is_staff)
        self.assertFalse(Usuario(role_id=2).is_staff)
        self.assertFalse(Usuario(role_id=3).is_staff)

    def test_admin_permission_rejects_clients_and_staff(self):
        for role_id in (2, 3):
            with self.subTest(role_id=role_id):
                permission = IsAdminUser()
                self.assertFalse(permission.has_permission(self.make_request(role_id), None))

    def test_admin_permission_accepts_administrator_role(self):
        permission = IsAdminUser()

        self.assertTrue(permission.has_permission(self.make_request(1), None))

    def test_only_administrators_can_list_or_modify_users(self):
        restricted_actions = ('list', 'create', 'update', 'partial_update', 'destroy', 'toggle_estado')
        for role_id in (2, 3):
            for action in restricted_actions:
                with self.subTest(role_id=role_id, action=action):
                    view = UsuarioViewSet()
                    view.action = action
                    permission = view.get_permissions()[0]
                    self.assertIsInstance(permission, IsAdminUser)
                    self.assertFalse(permission.has_permission(self.make_request(role_id), view))

    def test_authenticated_users_can_only_retrieve_their_own_user_record(self):
        for role_id in (2, 3):
            with self.subTest(role_id=role_id):
                view = UsuarioViewSet()
                view.request = SimpleNamespace(user=self.make_request(role_id).user)
                manager = MagicMock()
                filtered_queryset = object()
                manager.all.return_value.filter.return_value.order_by.return_value = filtered_queryset

                with patch('usuarios.views.Usuario.objects', manager):
                    queryset = view.get_queryset()

                self.assertIs(queryset, filtered_queryset)
                manager.all.return_value.filter.assert_called_once_with(pk=12)
                manager.all.return_value.order_by.assert_not_called()

    def test_administrator_user_queryset_is_not_scoped_to_self(self):
        view = UsuarioViewSet()
        view.request = SimpleNamespace(user=self.make_request(1).user)
        manager = MagicMock()
        queryset = object()
        manager.all.return_value.order_by.return_value = queryset

        with patch('usuarios.views.Usuario.objects', manager):
            result = view.get_queryset()

        self.assertIs(result, queryset)
        manager.all.return_value.filter.assert_not_called()
        manager.all.return_value.order_by.assert_called_once_with('id')
