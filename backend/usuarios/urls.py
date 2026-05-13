from rest_framework.routers import DefaultRouter
from .views import UsuarioViewSet, RoleViewSet, StatusViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'statuses', StatusViewSet)

urlpatterns = router.urls
