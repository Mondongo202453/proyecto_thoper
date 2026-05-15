from rest_framework.routers import DefaultRouter
from .views import PersonalViewSet, StaffAssignmentViewSet

router = DefaultRouter()
router.register(r'personal', PersonalViewSet)
router.register(r'asignaciones', StaffAssignmentViewSet)

urlpatterns = router.urls
