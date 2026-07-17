from rest_framework.routers import DefaultRouter
from .views import ServicioViewSet, TarifaViewSet, ServicioImagenViewSet

router = DefaultRouter()
router.register(r'servicios', ServicioViewSet, basename='servicio')
router.register(r'tarifas', TarifaViewSet, basename='tarifa')
router.register(r'imagenes', ServicioImagenViewSet, basename='servicio-imagen')

urlpatterns = router.urls
