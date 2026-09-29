# Despliegue del backend en Railway

La base `thoper_db2` ya fue importada y verificada en Railway. El acceso TCP
público temporal se retiró; el backend debe conectarse por la red privada de
Railway.

## Servicio web

1. Añade el repositorio del proyecto como un servicio nuevo en el mismo
   proyecto y entorno de Railway que MySQL.
2. Configura **Root Directory** como `/backend` y usa la misma región que
   MySQL (EU West / Amsterdam).
3. Configura estas variables en el servicio Django:

   | Variable | Valor |
   | --- | --- |
   | `SECRET_KEY` | Clave aleatoria larga, generada y guardada como secreto en Railway |
   | `DEBUG` | `False` |
   | `DB_NAME` | Referencia a `${{MySQL.MYSQLDATABASE}}` |
   | `DB_USER` | Referencia a `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | Referencia a `${{MySQL.MYSQLPASSWORD}}` |
   | `DB_HOST` | Referencia a `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | Referencia a `${{MySQL.MYSQLPORT}}` |
   | `CORS_ALLOWED_ORIGINS` | Orígenes HTTPS exactos del frontend en Vercel, separados por comas |
   | `CSRF_TRUSTED_ORIGINS` | Orígenes HTTPS exactos que necesiten enviar formularios a Django |
   | `FRONTEND_URL` | URL HTTPS del frontend en Vercel |
   | `MEDIA_ROOT` | `/app/media` |

   Si el servicio MySQL tiene otro nombre, ajusta `MySQL` en las referencias
   para que coincida con su nombre en Railway. No copies credenciales en el
   repositorio ni uses `MYSQL_PUBLIC_URL`.
4. Añade un volumen al servicio Django, montado en `/app/media`. Esto conserva
   las imágenes, videos y PDFs entre despliegues.
5. En **Settings → Deploy**, configura el comando pre-deploy:

   ```text
   python manage.py migrate --noinput
   ```

   El `Procfile` recopila los estáticos e inicia Gunicorn usando el puerto que
   Railway proporciona.
6. Genera el dominio público del servicio web y confirma que `RAILWAY_PUBLIC_DOMAIN`
   coincide con el host asignado. La configuración lo incorpora a `ALLOWED_HOSTS`.
7. Revisa los logs del despliegue y confirma que `/` responde con el mensaje de
   API en lugar de un error. No publiques el frontend hasta configurar su URL
   en `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL`.

El servidor solo publica los archivos bajo `media/uploads/` que usa el
portafolio. Los PDFs de cotizaciones deben seguir descargándose por la acción
autenticada de documentos, no mediante una URL pública de medios.

## Desarrollo local

Copia `.env.example` a `.env` solo para desarrollo local y reemplaza los valores
de ejemplo. No uses el `.env` local ni credenciales reales en Railway.
