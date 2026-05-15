from rest_framework.routers import DefaultRouter
from .views import NotificacionViewSet, ContactoMensajeViewSet

router = DefaultRouter()
router.register(r'notificaciones', NotificacionViewSet)
router.register(r'contacto', ContactoMensajeViewSet)

urlpatterns = router.urls
