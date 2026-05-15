from rest_framework.routers import DefaultRouter
from .views import ReservaViewSet, ReservationServiceViewSet

router = DefaultRouter()
router.register(r'reservas', ReservaViewSet)
router.register(r'reserva-detalles', ReservationServiceViewSet)

urlpatterns = router.urls
