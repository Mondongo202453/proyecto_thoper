from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include

def home(request):
    return JsonResponse({
        "mensaje": "API de Topher funcionando correctamente"
    })

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
]
