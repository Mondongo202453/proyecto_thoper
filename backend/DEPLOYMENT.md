# Despliegue del backend en Railway

## Compatibilidad y estado del despliegue

Para continuar el desarrollo local con la base de XAMPP (MariaDB 10.4.32), el
backend se mantiene temporalmente en Django 4.2.30, el último parche disponible
de la serie 4.2. Esta serie ya no recibe soporte de seguridad y es solo para
trabajo local; no debe considerarse una versión lista para un nuevo despliegue.
Antes de publicar, actualiza Django a una versión con soporte y compatible con
la base elegida; la serie Django 5.2 requiere MariaDB 10.5 o superior o MySQL
8.0.11 o superior.

El volcado `database/topher_db.sql` también fue generado con MariaDB 10.4.32.
Antes de cambiar versiones, confirma el motor y la versión reales, crea un
respaldo y comprueba que se pueda restaurar en un entorno de pruebas. No
actualices la base ni ejecutes migraciones de producción hasta validar la
compatibilidad y el esquema heredado.

Esta guía describe la configuración prevista para Railway, no el estado actual
de los servicios. Confirma en el panel que el servicio de aplicación y la base
estén activos y que los datos y respaldos necesarios estén disponibles antes
de iniciar un despliegue. Usa la red privada del proveedor para la conexión
entre el backend y la base de datos.

Antes de publicar, la organización responsable debe revisar el aviso de
privacidad de la aplicación y confirmar la identidad legal del responsable, los
plazos de conservación y las condiciones aplicables a los proveedores que
procesan datos.

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
   | `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` |
   | `EMAIL_HOST` | Servidor SMTP del proveedor de correo |
   | `EMAIL_PORT` | Puerto SMTP del proveedor (normalmente `587`) |
   | `EMAIL_USE_TLS` | `True` |
   | `EMAIL_USER` | Usuario SMTP, guardado como secreto |
   | `EMAIL_PASS` | Contraseña o clave de aplicación SMTP, guardada como secreto |

   Si el servicio MySQL tiene otro nombre, ajusta `MySQL` en las referencias
   para que coincida con su nombre en Railway. No copies credenciales en el
   repositorio ni uses `MYSQL_PUBLIC_URL`.
4. Añade un volumen al servicio Django, montado en `/app/media`. Esto conserva
   las imágenes, videos y PDFs entre despliegues.
5. No configures todavía migraciones automáticas como comando pre-deploy.
   Algunas tablas dependen del esquema heredado y usan `managed=False`.
   Primero compara las migraciones pendientes con el esquema real, restaura un
   respaldo en una copia de pruebas y valida allí el plan. Solo después de
   aprobarlo y contar con un respaldo restaurable debe definirse el comando de
   migración para producción. El `Procfile` recopila los estáticos e inicia
   Gunicorn usando el puerto que Railway proporciona.

6. Genera el dominio público del servicio web y confirma que `RAILWAY_PUBLIC_DOMAIN`
   coincide con el host asignado. La configuración lo incorpora a `ALLOWED_HOSTS`.
7. Revisa los logs del despliegue y confirma que `/` redirige al inicio del
   frontend definido en `FRONTEND_URL`. No publiques el frontend hasta
   configurar su URL en `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL`.

El servidor solo publica los archivos bajo `media/uploads/` que usa el
portafolio. Los PDFs de cotizaciones deben seguir descargándose por la acción
autenticada de documentos, no mediante una URL pública de medios.
Configura el SMTP antes de habilitar recuperación de contraseña; en producción
Django usa SMTP para evitar que los enlaces de recuperación o las respuestas a
mensajes de visitantes o avisos de asignación al personal terminen en los logs.

## Desarrollo local

Copia `.env.example` a `.env` solo para desarrollo local y reemplaza los valores
de ejemplo. No uses el `.env` local ni credenciales reales en Railway.

### Mensajes de contacto

Los mensajes enviados sin iniciar sesión aparecen en la bandeja del administrador.
Al responder, Django envía un correo al remitente usando el backend configurado.
Las respuestas a clientes con cuenta se entregan como notificaciones dentro de
la aplicación. En desarrollo, el backend de correo predeterminado es la consola:
los correos se muestran en la terminal de Django y no llegan a una bandeja real.
Configura un SMTP válido para probar entregas reales; las pruebas automatizadas
usan un backend en memoria y no envían correos externos.

### Pruebas de pago sin cobros

En desarrollo, `PAYMENT_MODE=mock` (valor predeterminado cuando `DEBUG=True`)
crea pagos marcados como `SIMULADO`, sin redirigir a Wompi, enviar datos de
tarjeta ni iniciar una transacción. Desde **Mis reservas**, inicia un pago de
prueba y elige simularlo como aprobado o rechazado. El simulador solo funciona
con `DEBUG=True`; si alguien intenta activarlo en producción, Django no inicia.

El valor predeterminado fuera de desarrollo es `PAYMENT_MODE=disabled`, que
bloquea la creación de pagos y deja los botones deshabilitados. Para probar la
integración con Wompi sin dinero real, configura explícitamente
`PAYMENT_MODE=wompi_sandbox` y las tres credenciales de prueba de Wompi
(`pub_test_...`, secreto de integridad y secreto de eventos). La aplicación
rechaza claves públicas que no sean de prueba. Nunca uses `pub_prod_` ni claves
de producción en pruebas.

Solo puede haber un pago pendiente por reserva a la vez; espera el resultado o
rechazo del intento actual antes de crear otro. Para que Wompi Sandbox actualice
el estado, configura el webhook público del servicio en
`/api/pagos/wompi/webhook/` con su secreto de eventos de prueba.
