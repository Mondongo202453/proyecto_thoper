from rest_framework.routers import DefaultRouter
from .views import ReservaViewSet, ReservationServiceViewSet

router = DefaultRouter()
router.register(r'reservas', ReservaViewSet, basename='reserva')
router.register(r'reserva-detalles', ReservationServiceViewSet, basename='reservation-service')

urlpatterns = router.urls
