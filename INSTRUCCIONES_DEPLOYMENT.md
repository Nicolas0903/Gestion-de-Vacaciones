# 🎯 INSTRUCCIONES RÁPIDAS - DEPLOYMENT A RENDER.COM

## ⚠️ IMPORTANTE ANTES DE EMPEZAR

**Tu aplicación usa MySQL localmente, pero Render Free solo soporta PostgreSQL.**

Tienes 2 opciones:

### **OPCIÓN 1: Migrar a PostgreSQL** (Recomendado - Gratis para siempre)
- ✅ Completamente gratis
- ⏰ 15 min de configuración
- 📝 Requiere ejecutar un script SQL de migración

### **OPCIÓN 2: Usar MySQL en otro servicio**
- 💵 Requiere pago: Railway ($5-10/mes), PlanetScale (gratis pero limitado), Clever Cloud
- ⏰ 5 min de configuración
- 📝 Más simple, pero con costo

---

## 🚀 PASOS RESUMIDOS (PostgreSQL en Render)

### 1️⃣ **Subir código a GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/gestor-vacaciones.git
git push -u origin main
```

### 2️⃣ **Crear cuenta en Render**
- Ve a [render.com](https://render.com) → Sign Up (gratis)

### 3️⃣ **Crear Base de Datos PostgreSQL**
- Dashboard → New + → PostgreSQL
- Name: `gestor-vacaciones-db`
- Plan: **Free**
- Create Database
- **GUARDAR las credenciales que te muestre**

### 4️⃣ **Ejecutar Schema en PostgreSQL**
Archivo completo en: `DEPLOY_GUIDE.md` (Paso 3.2)

### 5️⃣ **Desplegar Backend**
- Dashboard → New + → Web Service
- Conectar GitHub → Seleccionar tu repo
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- **Environment Variables** (copiar de `ENV_EXAMPLE_BACKEND.txt`)

### 6️⃣ **Desplegar Frontend**
- Render → New + → Static Site
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `build`
- **Environment Variable**: `REACT_APP_API_URL` (URL de tu backend)

### 7️⃣ **Listo!** 🎉
Accede a la URL que te dio Render para el frontend.

---

## 📋 **ARCHIVOS IMPORTANTES**

- `DEPLOY_GUIDE.md` - Guía detallada paso a paso
- `ENV_EXAMPLE_BACKEND.txt` - Variables de entorno del backend
- `ENV_EXAMPLE_FRONTEND.txt` - Variables de entorno del frontend
- `.gitignore` - Archivos que NO se suben a GitHub

---

## 🆘 **¿NECESITAS AYUDA?**

**Si prefieres mantener MySQL:**
Te recomiendo Railway.app ($5-10/mes) que sí soporta MySQL y es muy fácil de configurar.

**Si tienes problemas con PostgreSQL:**
Avísame y te ayudo con la migración del schema y ajustes en el código.

---

## ⚡ **DIFERENCIAS ENTRE DESARROLLO Y PRODUCCIÓN**

| Aspecto | Desarrollo (Local) | Producción (Render) |
|---------|-------------------|---------------------|
| Base de datos | MySQL | PostgreSQL |
| Backend URL | localhost:3002 | tu-app.onrender.com |
| Frontend URL | localhost:3000 | tu-frontend.onrender.com |
| Variables .env | En archivos locales | En Render Dashboard |

---

**👉 Consulta `DEPLOY_GUIDE.md` para instrucciones detalladas.**
