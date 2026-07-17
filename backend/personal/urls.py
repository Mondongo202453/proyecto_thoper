from rest_framework.routers import DefaultRouter
from .views import PersonalViewSet, StaffAssignmentViewSet

router = DefaultRouter()
router.register(r'personal', PersonalViewSet, basename='personal')
router.register(r'asignaciones', StaffAssignmentViewSet, basename='staff-assignment')

urlpatterns = router.urls
