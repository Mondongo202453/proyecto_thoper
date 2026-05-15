from rest_framework.routers import DefaultRouter
from .views import ServicioViewSet, TarifaViewSet, ServicioImagenViewSet

router = DefaultRouter()
router.register(r'servicios', ServicioViewSet)
router.register(r'tarifas', TarifaViewSet)
router.register(r'imagenes', ServicioImagenViewSet)

urlpatterns = router.urls
