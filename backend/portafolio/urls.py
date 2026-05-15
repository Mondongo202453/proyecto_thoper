from rest_framework.routers import DefaultRouter
from .views import PortafolioEventoViewSet, PortafolioMediaViewSet

router = DefaultRouter()
router.register(r'portafolio', PortafolioEventoViewSet)
router.register(r'multimedia', PortafolioMediaViewSet)

urlpatterns = router.urls
