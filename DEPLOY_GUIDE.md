# 🚀 Guía de Deployment - Gestor de Vacaciones Prayaga

Esta guía te llevará paso a paso desde tu código local hasta tener la aplicación funcionando en internet con Render.com (GRATIS).

---

## 📋 **REQUISITOS PREVIOS**

✅ Tener Git instalado
✅ Tener cuenta de GitHub
✅ Tener cuenta de Render.com (crear en [render.com](https://render.com))

---

## 🔧 **PASO 1: PREPARAR EL CÓDIGO**

### 1.1 Inicializar Git (si no lo has hecho)

```bash
# En la carpeta raíz del proyecto (gestor-vacaciones)
git init
git add .
git commit -m "Initial commit - Gestor de Vacaciones Prayaga"
```

### 1.2 Crear repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Click en "New repository"
3. Nombre: `gestor-vacaciones-prayaga`
4. Mantén como "Private" (recomendado) o "Public"
5. NO marques "Initialize with README"
6. Click "Create repository"

### 1.3 Conectar tu código con GitHub

```bash
# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/gestor-vacaciones-prayaga.git
git branch -M main
git push -u origin main
```

Si te pide credenciales:
- Usuario: tu email de GitHub
- Password: usa un **Personal Access Token** (no tu contraseña)
  - Crear token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token

---

## 🗄️ **PASO 2: CREAR BASE DE DATOS EN RENDER**

### 2.1 Crear PostgreSQL Database

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configuración:
   - **Name**: `gestor-vacaciones-db`
   - **Database**: `gestor_vacaciones`
   - **User**: (auto-generado)
   - **Region**: `Oregon (West US)` (recomendado)
   - **PostgreSQL Version**: `16` (última)
   - **Plan**: **Free** ✅
4. Click "Create Database"

### 2.2 Guardar credenciales

Una vez creada, verás:
- **Internal Database URL**: Úsala en el backend
- **External Database URL**: Para conectar desde tu PC
- **PSQL Command**: Para acceder por terminal

⚠️ **IMPORTANTE**: Guarda estas credenciales, las necesitarás después.

---

## 🔄 **PASO 3: MIGRAR SCHEMA A POSTGRESQL**

⚠️ Tu app usa MySQL, pero Render Free solo tiene PostgreSQL. Necesitamos ajustar el schema.

### 3.1 Conectar a la base de datos desde tu PC

```bash
# Instalar cliente PostgreSQL (si no lo tienes)
# Windows: Descargar desde https://www.postgresql.org/download/windows/

# Conectar (usa el PSQL Command que te dio Render)
psql -h dpg-xxxxx-a.oregon-postgres.render.com -U gestor_vacaciones_user gestor_vacaciones
```

### 3.2 Ejecutar schema (versión PostgreSQL)

Copia y pega este SQL adaptado para PostgreSQL:

```sql
-- Crear tablas en PostgreSQL
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  cargo VARCHAR(100),
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  jefe_id INTEGER REFERENCES empleados(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS periodos_vacaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_inicio_periodo DATE NOT NULL,
  fecha_fin_periodo DATE NOT NULL,
  dias_correspondientes INTEGER NOT NULL DEFAULT 0,
  dias_gozados INTEGER DEFAULT 0,
  dias_pendientes INTEGER GENERATED ALWAYS AS (dias_correspondientes - dias_gozados) STORED,
  estado VARCHAR(20) DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes_vacaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo_id INTEGER NOT NULL REFERENCES periodos_vacaciones(id) ON DELETE CASCADE,
  fecha_inicio_vacaciones DATE NOT NULL,
  fecha_fin_vacaciones DATE NOT NULL,
  dias_solicitados INTEGER NOT NULL,
  motivo TEXT,
  estado VARCHAR(20) DEFAULT 'borrador',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aprobaciones (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes_vacaciones(id) ON DELETE CASCADE,
  aprobador_id INTEGER NOT NULL REFERENCES empleados(id),
  fecha_aprobacion TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'pendiente',
  comentarios TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar roles iniciales
INSERT INTO roles (nombre, descripcion) VALUES
('admin', 'Administrador del sistema'),
('contadora', 'Contadora - Gestión de vacaciones'),
('gerente_general', 'Gerente General'),
('gerente_consultoria', 'Gerente de Consultoría'),
('jefe_operaciones', 'Jefe de Operaciones'),
('analista_senior', 'Analista Senior'),
('consultor', 'Consultor'),
('contador', 'Contador'),
('comercial', 'Comercial'),
('practicante', 'Practicante'),
('empleado', 'Empleado general');

-- Crear usuario administrador
INSERT INTO empleados (nombres, apellidos, email, password, fecha_ingreso, cargo, rol_id) 
VALUES ('Admin', 'Sistema', 'admin@prayaga.com', '$2a$10$Xh6/9.qvqrH9qKVLZqKx0uN8bZQqVXrQqZqGvVzQxVqRqZqKx0uN8', '2024-01-01', 'Administrador', 1);
```

---

## 🖥️ **PASO 4: DESPLEGAR BACKEND EN RENDER**

### 4.1 Crear Web Service

1. En Render Dashboard → "New +" → "Web Service"
2. Conectar tu repositorio de GitHub
3. Autorizar acceso a Render
4. Seleccionar: `gestor-vacaciones-prayaga`

### 4.2 Configuración del Backend

- **Name**: `gestor-vacaciones-backend`
- **Region**: `Oregon (West US)`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: **Free** ✅

### 4.3 Variables de Entorno

En "Environment Variables", agregar:

```
NODE_ENV=production
PORT=3002
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_PORT=5432
DB_USER=gestor_vacaciones_user
DB_PASSWORD=xxxxxxxxxx
DB_NAME=gestor_vacaciones
JWT_SECRET=tu_secreto_super_seguro_generado_aqui
FRONTEND_URL=https://tu-frontend.onrender.com
```

⚠️ **Reemplaza** los valores de DB con los que te dio Render en el Paso 2.

### 4.4 Crear servicio

Click "Create Web Service"

⏳ Esperará ~5 minutos mientras instala dependencias y arranca.

### 4.5 Verificar funcionamiento

Una vez desplegado, te dará una URL como:
`https://gestor-vacaciones-backend.onrender.com`

Prueba: `https://gestor-vacaciones-backend.onrender.com/api/health`

---

## 🎨 **PASO 5: DESPLEGAR FRONTEND**

Tienes 2 opciones:

### **OPCIÓN A: Render (Todo en un lugar)**

1. Render Dashboard → "New +" → "Static Site"
2. Conectar tu repositorio
3. Configuración:
   - **Name**: `gestor-vacaciones-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. Variables de entorno:
```
REACT_APP_API_URL=https://gestor-vacaciones-backend.onrender.com/api
```

5. Click "Create Static Site"

### **OPCIÓN B: Vercel (Más rápido - Recomendado)**

1. Ve a [vercel.com](https://vercel.com)
2. "New Project" → Import de GitHub
3. Seleccionar `gestor-vacaciones-prayaga`
4. Configuración:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Environment Variables:
```
REACT_APP_API_URL=https://gestor-vacaciones-backend.onrender.com/api
```

6. Click "Deploy"

---

## ✅ **PASO 6: ACTUALIZAR CORS EN BACKEND**

Una vez que tengas la URL del frontend, actualiza en Render:

1. Ve a tu backend en Render
2. Environment → Editar `FRONTEND_URL`
3. Cambiar a: `https://tu-frontend-url.onrender.com` (o Vercel)
4. Guardar y re-desplegar

---

## 🧪 **PASO 7: PROBAR LA APLICACIÓN**

1. Accede a tu frontend: `https://tu-app.onrender.com`
2. Intenta login con:
   - Email: `admin@prayaga.com`
   - Password: `admin123`

Si funciona: **¡FELICIDADES! 🎉**

---

## ⚠️ **LIMITACIONES DEL PLAN FREE**

- ⏰ Backend "duerme" después de 15 min sin uso
- ⏳ Tarda ~30 seg en despertar al primer acceso
- 💾 750 horas/mes de uptime (suficiente para uso en oficina)
- 🗄️ Base de datos: 1GB storage, 90 días de retención

---

## 🔄 **ACTUALIZACIONES FUTURAS**

Para actualizar tu app:

```bash
# Hacer cambios en tu código local
git add .
git commit -m "Descripción de cambios"
git push origin main
```

Render automáticamente detectará el cambio y re-desplegará tu app ✅

---

## 📞 **SOPORTE**

Si tienes problemas, revisa:
- Logs en Render Dashboard → tu servicio → "Logs"
- Consola del navegador (F12)

---

**¡Listo!** Tu app ahora está en internet 🌍
