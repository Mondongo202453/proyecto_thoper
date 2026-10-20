<!--
  PLANTILLA DE REFERENCIA
  Este es un ejemplo de README profesional. Puedes usarlo como base o seguir otro formato.
  Cómo usarlo: copia este archivo en la raíz de tu repo con el nombre README.md
  y reemplaza todo lo que está entre [corchetes] con la información de tu proyecto.
  Borra las secciones que no apliquen. (Este comentario no se ve en GitHub.)
-->

# Proyecto TOPHER Producciones

> Aplicación web para la empresa **TOPHER Producciones**, dedicada a la producción y ejecución de shows de efectos especiales y pirotecnia profesional para eventos.

## 📌 El problema
TOPHER Producciones no contaba con presencia digital ni una plataforma para que sus clientes pudieran conocer sus servicios, ver su portafolio de eventos y realizar solicitudes de reserva de forma rápida y organizada.

## ✅ La solución
Plataforma web full-stack que permite a los clientes explorar el catálogo de servicios, ver el portafolio de eventos realizados, enviar mensajes de contacto y realizar reservas en línea. Incluye un panel de administración completo para que el equipo interno gestione reservas, servicios, personal y mensajes.

**Funcionalidades principales:**
- 📅 Reserva de servicios con seguimiento de estado (Pendiente, Confirmada, Completada)
- 🖼️ Portafolio de eventos realizados
- 📬 Formulario de contacto con la empresa
- 🔐 Panel de administración con autenticación JWT
- 👤 Registro e inicio de sesión de clientes

## 🛠️ Tecnologías
| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, TailwindCSS, TypeScript |
| Backend | Django 4.2, Django REST Framework, JWT |
| Base de datos | MariaDB / MySQL |
| Otras herramientas | Git, GitHub, Vercel (frontend), Railway (backend) |

## 🏗️ Arquitectura

```
[Cliente / Navegador]
        ↓  HTTP / HTTPS
[Frontend - React + Vite]  →  http://localhost:5173
        ↓  API REST (axios)
[Backend - Django REST]    →  http://localhost:8000/api/
        ↓  PyMySQL
[Base de datos - MariaDB]  →  topher_db
```

## 🚀 Cómo ejecutarlo localmente

### Requisitos previos
- [Node.js 20+](https://nodejs.org/)
- [Python 3.12+](https://www.python.org/)
- [XAMPP](https://www.apachefriends.org/) u otro servidor MySQL/MariaDB corriendo en el puerto `3306`
- [Git](https://git-scm.com/)

---

### 1. Clonar el repositorio
```bash
git clone https://github.com/Mondongo202453/proyecto_thoper.git
cd proyecto_thoper
```

---

### 2. Configurar la base de datos
1. Asegúrate de que tu servidor **MySQL/MariaDB esté encendido** (ej. inicia el servicio MySQL en XAMPP).
2. Crea una base de datos llamada `topher_db` en tu gestor (phpMyAdmin o línea de comandos):
   ```sql
   CREATE DATABASE topher_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Importa el archivo SQL del proyecto:
   ```bash
   mysql -u root -p topher_db < database/topher_db.sql
   ```

---

### 3. Configurar y ejecutar el Backend (Django)

```bash
cd backend
```

Crea el archivo de variables de entorno copiando el ejemplo:
```bash
copy .env.example .env
```

Edita el archivo `.env` con tus credenciales locales:
```env
SECRET_KEY=django-insecure-clave-local-de-desarrollo
DEBUG=True
DB_NAME=topher_db
DB_USER=root
DB_PASSWORD=        # tu contraseña de MySQL (dejar vacío si no tiene)
DB_HOST=127.0.0.1
DB_PORT=3306
```

Crea y activa el entorno virtual de Python:
```bash
python -m venv venv
venv\Scripts\activate        # En Windows
# source venv/bin/activate   # En Linux/Mac
```

Instala las dependencias e inicia el servidor:
```bash
pip install -r requirements.txt
python manage.py migrate --fake-initial
python manage.py runserver
```

El backend quedará disponible en → **http://127.0.0.1:8000**

---

### 4. Configurar y ejecutar el Frontend (React + Vite)

Abre una **nueva terminal** y ejecuta:

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

El frontend quedará disponible en → **http://localhost:5173**

---

### 5. Crear usuario administrador (opcional)
Con el backend corriendo, ejecuta desde la carpeta `backend`:
```bash
python create_admin.py
```
Esto creará un usuario `admin` con la contraseña definida en tu `.env` (`DJANGO_ADMIN_PASSWORD`).

---

**Demo en producción:** *(próximamente)*

## 📸 Capturas
| Pantalla | Descripción |
|---|---|
| ![](docs/img/captura-1.png) | Página principal |
| ![](docs/img/captura-2.png) | Panel de administración |

## 👥 Equipo
| Nombre | Rol | GitHub |
|---|---|---|
| Daniel Bustos | Frontend, Base de datos | [@Mondongo202453](https://github.com/Mondongo202453) |
| Julián Presiga | Backend | [@presiga84](https://github.com/presiga84) |
| Cristian Vásquez | Backend | [@crixx3101](https://github.com/crixx3101) |
| Juan Pablo Velilla | Base de datos | [@velilla07](https://github.com/velilla07) |

## 📄 Contexto
Proyecto formativo del programa **Análisis y Desarrollo de Software (ADSO)** · SENA · 2026.
