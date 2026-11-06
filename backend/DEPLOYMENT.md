# Despliegue del backend en Railway

## Compatibilidad y estado del despliegue

El backend usa Django 5.2.19 LTS, una versión con soporte para el nuevo
despliegue. Django 5.2 requiere MariaDB 10.5 o superior o MySQL 8.0.11 o
superior. La base local de XAMPP usa MariaDB 10.4.32 y no es compatible con esta
versión; conserva el respaldo local y no conectes el backend actualizado a esa
base.

El volcado generado con MariaDB 10.4.32 debe restaurarse en la base MySQL 8 del
nuevo entorno y verificarse antes de habilitar tráfico. No ejecutes migraciones
automáticas: algunas tablas dependen del esquema heredado y usan
`managed=False`. Primero compara las migraciones pendientes con el esquema
restaurado y valida cualquier cambio de esquema en una copia de pruebas.

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
   | `EMAIL_USER` | `thoperproducciones.app@gmail.com`; cuenta SMTP, guardada como secreto |
   | `EMAIL_PASS` | Contraseña de aplicación de Google, guardada como secreto |
   | `EMAIL_FROM` | `thoperproducciones.app@gmail.com` |

   Si el servicio MySQL tiene otro nombre, ajusta `MySQL` en las referencias
   para que coincida con su nombre en Railway. No copies credenciales en el
   repositorio ni uses `MYSQL_PUBLIC_URL`.
   Para Gmail, habilita la verificación en dos pasos y genera una contraseña
   de aplicación para SMTP. No uses la contraseña normal de la cuenta. El
   servidor utiliza STARTTLS en `smtp.gmail.com:587`; configura la misma cuenta
   emisora en `EMAIL_USER` y `EMAIL_FROM`. Sin estas credenciales, la API
   informa el fallo de envío y no presenta el correo como enviado.
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
La recuperación guarda en `reset_tokens` únicamente el hash SHA-256 del token.
El enlace dura 15 minutos, se invalida si falla la entrega SMTP y solo puede
utilizarse una vez. Configura `FRONTEND_URL` como la URL HTTPS real del sitio;
el token viaja en el fragmento (`#token=`) para no incluirlo en las solicitudes
HTTP del navegador.

## Desarrollo local

Copia `.env.example` a `.env` solo para desarrollo local y reemplaza los valores
de ejemplo. Para probar recuperación real, agrega una contraseña de aplicación
de Gmail a `EMAIL_PASS`; el proyecto no simula entregas ni muestra éxito cuando
SMTP no confirma el envío. No uses el `.env` local ni credenciales reales en
Railway.

### Mensajes de contacto

Los mensajes enviados sin iniciar sesión aparecen en la bandeja del administrador.
Al responder, Django envía un correo al remitente usando el backend configurado.
Las respuestas a clientes con cuenta se entregan como notificaciones dentro de
la aplicación. Los correos del proyecto usan el SMTP configurado; no se
consideran entregados cuando SMTP no confirma el envío. Las pruebas automatizadas
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
