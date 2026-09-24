from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PortafolioEventoViewSet, PortafolioMediaViewSet
from .uploads import MediaUploadView

router = DefaultRouter()
router.register(r'portafolio', PortafolioEventoViewSet, basename='portafolio-evento')
router.register(r'multimedia', PortafolioMediaViewSet, basename='portafolio-media')

urlpatterns = router.urls
urlpatterns += [path('media-upload/', MediaUploadView.as_view(), name='media-upload')]
