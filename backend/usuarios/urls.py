from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UsuarioViewSet, RoleViewSet, StatusViewSet,
    RegisterView, MeView,
    CustomTokenObtainPairView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'statuses', StatusViewSet, basename='status')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Perfil propio
    path('me/', MeView.as_view(), name='me'),

    # Reset de contraseña (RF04, RN07)
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]

urlpatterns += router.urls
