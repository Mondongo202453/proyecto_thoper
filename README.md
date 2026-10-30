# Topher Producciones

Aplicación web para presentar los servicios de Topher Producciones y apoyar la
gestión de solicitudes, reservas y contenido del portafolio de eventos.

## Funcionalidades

- Consulta de servicios y portafolio de eventos.
- Registro, inicio de sesión y gestión del perfil de clientes.
- Solicitud y seguimiento de reservas.
- Calendario administrativo y selección de horarios disponibles en intervalos de 1 a 3 horas, incluso al cruzar la medianoche.
- Paneles para clientes, personal y administración, según el rol.
- Gestión de información del portafolio y documentos relacionados con reservas.
- Modo de pago simulado para pruebas locales, sin cobros ni transacciones reales.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Python, Django, Django REST Framework |
| Base de datos | MySQL/MariaDB |
| Despliegue previsto | Vercel (frontend) y Railway (backend y base de datos) |

El frontend consume la API REST del backend. En desarrollo, Vite sirve la
interfaz en `http://127.0.0.1:5173` y Django expone la API en
`http://127.0.0.1:8000/api/`.

## Requisitos para desarrollo local

- Windows 10 u 11.
- XAMPP con MySQL/MariaDB iniciado. El volcado incluido fue generado con
  MariaDB 10.4.32.
- Python 3.11.
- Node.js 22 o compatible con Vite 8.
- Git.

### 1. Preparar la base de datos

Inicia el servicio MySQL desde el panel de XAMPP y confirma que usa el puerto
configurado para tu instalación. El archivo `database/topher_db.sql` crea una
base llamada `topher_db`; impórtalo únicamente en una base local nueva o de
pruebas. No lo importes sobre una base que contenga datos que quieras conservar.

La plantilla `backend/.env.example` usa `DB_NAME=thoper_db2`. Si importas el
volcado anterior, cambia `DB_NAME` en tu `.env` a `topher_db`, o selecciona la
base local que realmente contiene el esquema del proyecto. No cambies ni
compartas las credenciales de tu `.env`.

### 2. Configurar el backend

Desde la raíz del repositorio, ejecuta en PowerShell:

```powershell
Set-Location .\backend
py -3.11 -m venv env
.\env\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env` y verifica como mínimo `SECRET_KEY`, `DEBUG`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_PORT`. La configuración
de ejemplo es solo para desarrollo local; reemplaza la contraseña de
administrador de ejemplo antes de crear o usar esa cuenta.

Con el entorno virtual activo, valida e inicia el backend:

```powershell
python manage.py check
python manage.py test
python manage.py runserver 127.0.0.1:8000
```

Las tablas heredadas dependen del esquema SQL importado. No ejecutes migraciones
en bloque sin revisar antes qué tablas administra Django y cuáles pertenecen a
la base existente.

### 3. Configurar el frontend

En otra terminal de PowerShell:

```powershell
Set-Location .\frontend
npm ci
npm run dev
```

Vite usa `http://127.0.0.1:8000` como backend predeterminado. Si el backend usa
otra dirección, configura `VITE_BACKEND_URL` o `VITE_API_URL` en el entorno
local del frontend. No incluyas secretos del backend en variables `VITE_*`.

## Pruebas de pago

El modo local `PAYMENT_MODE=mock` crea registros marcados como `SIMULADO`; no
redirige a Wompi ni realiza cobros. Para habilitarlo, el backend debe usar
`DEBUG=True`. Consulta [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md) para los
modos de pago y las precauciones de despliegue.

## Estructura del repositorio

```text
backend/      API Django, aplicaciones y configuración
database/     Volcado SQL de referencia para una base local nueva
frontend/     Aplicación React y configuración de Vite
```

## Despliegue

La guía de configuración del backend está en
[backend/DEPLOYMENT.md](backend/DEPLOYMENT.md). Antes de desplegar, verifica
que la base de datos esté disponible, sea compatible con la versión de Django
elegida y tenga un respaldo comprobado. La configuración documentada no
garantiza que los servicios de alojamiento sigan activos.

## Proyecto formativo

Proyecto desarrollado en el contexto de formación ADSO del SENA.
