from rest_framework.routers import DefaultRouter
from .views import NotificacionViewSet, ContactoMensajeViewSet

router = DefaultRouter()
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')
router.register(r'contacto', ContactoMensajeViewSet, basename='contacto')

urlpatterns = router.urls
