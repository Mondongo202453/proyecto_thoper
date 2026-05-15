from rest_framework.routers import DefaultRouter
from .views import CotizacionViewSet

router = DefaultRouter()
router.register(r'cotizaciones', CotizacionViewSet)

urlpatterns = router.urls
