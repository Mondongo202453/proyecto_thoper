from rest_framework.routers import DefaultRouter
from .views import PortafolioEventoViewSet, PortafolioMediaViewSet

router = DefaultRouter()
router.register(r'portafolio', PortafolioEventoViewSet, basename='portafolio-evento')
router.register(r'multimedia', PortafolioMediaViewSet, basename='portafolio-media')

urlpatterns = router.urls
