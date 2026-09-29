from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

def home(request):
    return JsonResponse({
        "mensaje": "API de Topher funcionando correctamente"
    })

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('servicios.urls')),
    path('api/', include('reservas.urls')),
    path('api/', include('personal.urls')),
    path('api/', include('portafolio.urls')),
    path('api/', include('documentos.urls')),
    path('api/', include('comunicacion.urls')),
    path('api/', include('pagos.urls')),
]

# Serve media files during development when DEBUG=True
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r'^media/uploads/(?P<path>.+)$',
            serve,
            {'document_root': settings.MEDIA_ROOT / 'uploads'},
        ),
    ]
