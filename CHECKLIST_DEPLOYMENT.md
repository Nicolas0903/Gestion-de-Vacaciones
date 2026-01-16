# ✅ CHECKLIST - DEPLOYMENT PASO A PASO

Usa esta lista para ir marcando tu progreso.

---

## 📦 **FASE 1: PREPARACIÓN** (LISTO ✅)

- [x] ✅ Código preparado para producción
- [x] ✅ .gitignore creado
- [x] ✅ Dependencia PostgreSQL añadida al backend
- [x] ✅ Variables de entorno documentadas
- [x] ✅ Schema PostgreSQL creado
- [x] ✅ Documentación completa generada

---

## 🔧 **FASE 2: SUBIR A GITHUB** (TÚ HACES ESTO)

- [ ] Instalar Git (si no lo tienes)
- [ ] Ejecutar `git init` en la carpeta del proyecto
- [ ] Ejecutar `git add .`
- [ ] Ejecutar `git commit -m "Initial commit"`
- [ ] Crear repositorio en GitHub
- [ ] Obtener Personal Access Token de GitHub
- [ ] Ejecutar `git remote add origin ...`
- [ ] Ejecutar `git push -u origin main`
- [ ] Verificar en github.com que los archivos estén subidos

**📖 Guía:** `COMANDOS_GIT.md`

---

## 🗄️ **FASE 3: BASE DE DATOS EN RENDER** (TÚ HACES ESTO)

- [ ] Crear cuenta en [render.com](https://render.com) (gratis)
- [ ] Dashboard → New + → PostgreSQL
- [ ] Configurar:
  - Name: `gestor-vacaciones-db`
  - Database: `gestor_vacaciones`
  - Plan: **Free**
- [ ] Click "Create Database"
- [ ] Guardar credenciales (Host, Port, User, Password, Database)
- [ ] Acceder a la Shell de la DB en Render
- [ ] Copiar y ejecutar TODO el contenido de `backend/sql/schema-postgresql.sql`
- [ ] Verificar: `SELECT * FROM roles;` (debería mostrar 11 roles)
- [ ] Verificar: `SELECT * FROM empleados;` (debería mostrar 1 admin)

**📖 Guía:** `MIGRATION_GUIDE.md` - Paso 1-5

---

## 🖥️ **FASE 4: BACKEND EN RENDER** (TÚ HACES ESTO)

- [ ] Dashboard Render → New + → Web Service
- [ ] Conectar con GitHub (autorizar acceso)
- [ ] Seleccionar tu repositorio
- [ ] Configurar servicio:
  - Name: `gestor-vacaciones-backend`
  - Region: `Oregon (West US)`
  - Branch: `main`
  - Root Directory: `backend`
  - Runtime: `Node`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Plan: **Free**
- [ ] Agregar Environment Variables:
  ```
  NODE_ENV=production
  PORT=3002
  DB_HOST=(de Render DB)
  DB_PORT=5432
  DB_USER=(de Render DB)
  DB_PASSWORD=(de Render DB)
  DB_NAME=gestor_vacaciones
  JWT_SECRET=(generar uno seguro)
  FRONTEND_URL=(dejarlo vacío por ahora)
  ```
- [ ] Click "Create Web Service"
- [ ] Esperar ~5 min que termine el deploy
- [ ] Copiar la URL asignada (ej: `https://gestor-vacaciones-backend.onrender.com`)
- [ ] Probar: Abrir `https://TU-BACKEND-URL.onrender.com/` en navegador
- [ ] Deberías ver: `{"mensaje": "Gestor de Vacaciones API - Prayaga", ...}`

**📖 Guía:** `DEPLOY_GUIDE.md` - Paso 4

---

## 🎨 **FASE 5: FRONTEND EN RENDER** (TÚ HACES ESTO)

### Opción A: Render (todo en un lugar)

- [ ] Dashboard Render → New + → Static Site
- [ ] Conectar tu repositorio
- [ ] Configurar:
  - Name: `gestor-vacaciones-frontend`
  - Branch: `main`
  - Root Directory: `frontend`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `build`
- [ ] Environment Variables:
  ```
  REACT_APP_API_URL=https://TU-BACKEND-URL.onrender.com/api
  ```
  (Reemplazar con la URL real del backend del paso anterior)
- [ ] Click "Create Static Site"
- [ ] Esperar ~3-5 min
- [ ] Copiar la URL del frontend (ej: `https://gestor-vacaciones-frontend.onrender.com`)

### Opción B: Vercel (más rápido - recomendado)

- [ ] Crear cuenta en [vercel.com](https://vercel.com)
- [ ] New Project → Import from GitHub
- [ ] Seleccionar tu repositorio
- [ ] Configurar:
  - Framework: `Create React App`
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `build`
- [ ] Environment Variables:
  ```
  REACT_APP_API_URL=https://TU-BACKEND-URL.onrender.com/api
  ```
- [ ] Click "Deploy"
- [ ] Copiar la URL asignada

**📖 Guía:** `DEPLOY_GUIDE.md` - Paso 5

---

## 🔄 **FASE 6: ACTUALIZAR CORS** (TÚ HACES ESTO)

- [ ] Volver a Render → Tu backend
- [ ] Environment → Variables de entorno
- [ ] Editar `FRONTEND_URL`
- [ ] Poner la URL completa del frontend: `https://tu-frontend.onrender.com`
- [ ] Guardar cambios
- [ ] El servicio se re-desplegará automáticamente (~2 min)

**📖 Guía:** `DEPLOY_GUIDE.md` - Paso 6

---

## 🧪 **FASE 7: PROBAR LA APP** (TÚ HACES ESTO)

- [ ] Abrir la URL del frontend en tu navegador
- [ ] Debería cargar la página de Login
- [ ] Intentar login:
  - Email: `admin@prayaga.com`
  - Password: `admin123`
- [ ] Deberías ver el Dashboard ✅
- [ ] Probar crear una solicitud de vacaciones (fallará porque no hay periodos)
- [ ] Verificar que el calendario se vea bien
- [ ] Probar cerrar sesión y volver a entrar

**¿Funciona todo?** 🎉 **¡FELICIDADES!**

---

## 📊 **FASE 8: POBLAR CON DATOS REALES** (Opcional)

Si quieres cargar todos los empleados y vacaciones:

**Opción 1: Adaptar scripts existentes**
- [ ] Modificar scripts `crear-*.js` para usar PostgreSQL
- [ ] Cambiar `mysql2` por `pg`
- [ ] Actualizar sintaxis de queries
- [ ] Ejecutar desde tu PC conectando a Render DB

**Opción 2: Crear manualmente desde la UI**
- [ ] Login como admin
- [ ] Ir a "Empleados"
- [ ] Crear cada empleado uno por uno
- [ ] Asignar periodos de vacaciones

**📖 Guía:** `MIGRATION_GUIDE.md` - Sección "Migrar Datos"

---

## 🎯 **RESUMEN DE URLs**

Una vez completado, tendrás:

- **Frontend**: `https://tu-app.onrender.com` (o Vercel)
- **Backend API**: `https://tu-backend.onrender.com`
- **Base de Datos**: `dpg-xxxxx.oregon-postgres.render.com:5432`

---

## ⚠️ **IMPORTANTE RECORDAR**

- 🕐 La app "duerme" después de 15 min sin uso (plan free)
- ⏳ Tarda ~30 seg en despertar al primer acceso
- 💾 Base de datos: 1GB max, 90 días retención
- 🔄 Cada push a GitHub re-despliega automáticamente

---

## 🆘 **SI ALGO NO FUNCIONA**

### Backend no inicia:
1. Render → Tu backend → Logs
2. Buscar errores en rojo
3. Verificar variables de entorno

### Frontend muestra "Network Error":
1. Verificar `REACT_APP_API_URL` en variables
2. Verificar CORS en backend (`FRONTEND_URL`)
3. Verificar que backend esté corriendo

### No puedo hacer login:
1. Verificar que ejecutaste el schema PostgreSQL completo
2. Verificar logs del backend
3. Probar endpoint: `https://tu-backend.onrender.com/` (debería responder)

---

## 📞 **ARCHIVOS DE AYUDA**

- 📘 `README.md` - Información general del proyecto
- 📗 `DEPLOY_GUIDE.md` - Guía completa y detallada
- 📙 `MIGRATION_GUIDE.md` - Migración MySQL → PostgreSQL
- 📕 `COMANDOS_GIT.md` - Comandos Git paso a paso
- 📄 `ENV_EXAMPLE_BACKEND.txt` - Variables del backend
- 📄 `ENV_EXAMPLE_FRONTEND.txt` - Variables del frontend

---

**¡ÉXITO! 🚀** Una vez completes todo, tu app estará en internet y accesible desde cualquier lugar.
