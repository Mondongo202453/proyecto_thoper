from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.permissions import IsAdminUser
from rest_framework.test import APIRequestFactory

from usuarios.models import Usuario
from usuarios.serializers import PasswordResetConfirmSerializer, PasswordResetRequestSerializer
from usuarios.views import UsuarioViewSet


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
