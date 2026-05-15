import os
import django
from django.db import connection
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def fix_migrations():
    print("Corrigiendo historial de migraciones...")
    apps = ['usuarios', 'servicios', 'reservas', 'personal', 'portafolio']
    
    with connection.cursor() as cursor:
        for app in apps:
            # Verificar si ya existe
            cursor.execute("SELECT id FROM django_migrations WHERE app = %s AND name = '0001_initial'", [app])
            if not cursor.fetchone():
                print(f"Insertando registro para {app}...")
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, '0001_initial', %s)",
                    [app, datetime.now()]
                )
    print("¡Listo!")

if __name__ == "__main__":
    fix_migrations()
