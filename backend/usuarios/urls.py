from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UsuarioViewSet, RoleViewSet, StatusViewSet, RegisterView

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'statuses', StatusViewSet)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

urlpatterns += router.urls
