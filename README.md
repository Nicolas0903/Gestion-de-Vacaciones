# 🏖️ Gestor de Vacaciones - Prayaga

Sistema web integral para la gestión de vacaciones de empleados.

## 📋 Características

- ✅ Gestión de empleados y periodos vacacionales
- ✅ Solicitud y aprobación de vacaciones
- ✅ Dashboard con KPIs y métricas
- ✅ Calendario de vacaciones
- ✅ Sistema de notificaciones
- ✅ Control de roles y permisos
- ✅ Generación de reportes PDF
- ✅ Historial de vacaciones ganadas y gozadas

## 🛠️ Tecnologías

**Backend:**
- Node.js + Express
- MySQL (local) / PostgreSQL (producción)
- JWT para autenticación
- bcrypt para encriptación

**Frontend:**
- React 18
- React Router v6
- Tailwind CSS
- Heroicons
- date-fns
- axios

## 🚀 Instalación Local

### Requisitos
- Node.js 16+
- MySQL 8+ (desarrollo local)
- npm o yarn

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables en .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 🌐 Deployment a Producción

Para desplegar la aplicación en internet (GRATIS):

1. **Lee primero:** `INSTRUCCIONES_DEPLOYMENT.md` (resumen rápido)
2. **Guía detallada:** `DEPLOY_GUIDE.md` (paso a paso completo)
3. **Migración DB:** `MIGRATION_GUIDE.md` (MySQL → PostgreSQL)

### Archivos de Configuración

- `.gitignore` - Archivos excluidos de Git
- `ENV_EXAMPLE_BACKEND.txt` - Variables de entorno del backend
- `ENV_EXAMPLE_FRONTEND.txt` - Variables de entorno del frontend
- `backend/sql/schema.sql` - Schema MySQL (local)
- `backend/sql/schema-postgresql.sql` - Schema PostgreSQL (producción)

## 👥 Usuarios de Prueba

### Administración
- **Admin:** admin@prayaga.com / admin123
- **Contadora:** rocio.picon@prayaga.biz / Contadora2024

### Gerencia
- **Gerente General:** magali.sevillano@prayaga.biz / Magali2024
- **Gerente Consultoría:** ricardo.martinez@prayaga.biz / Ricardo2024

### Empleados
- **Ver archivo completo de credenciales en la documentación del proyecto**

## 📁 Estructura del Proyecto

```
gestor-vacaciones/
├── backend/
│   ├── sql/                    # Schemas de base de datos
│   ├── src/
│   │   ├── config/            # Configuración (DB, JWT)
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── middleware/        # Autenticación, validación
│   │   ├── models/            # Modelos de datos
│   │   ├── routes/            # Endpoints API
│   │   ├── services/          # Servicios (PDF, etc)
│   │   └── index.js           # Punto de entrada
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── context/           # Context API (Auth)
│   │   ├── pages/             # Páginas de la aplicación
│   │   ├── services/          # API cliente (axios)
│   │   └── App.js
│   └── package.json
│
└── README.md
```

## 🔐 Roles y Permisos

- **Admin**: Acceso total al sistema
- **Contadora**: Gestión de empleados y vacaciones
- **Gerentes**: Aprobar solicitudes de su equipo
- **Empleados**: Ver y solicitar sus vacaciones

## 📊 Funcionalidades por Rol

### Todos los usuarios:
- Dashboard personal
- Mis solicitudes de vacaciones
- Vacaciones ganadas (historial)
- Mi perfil
- Notificaciones

### Admin + Contadora:
- Gestión de empleados
- Estado de vacaciones (todos los empleados)
- Calendario general

### Jefes/Gerentes:
- Aprobaciones de su equipo
- Calendario de su equipo

## 📝 Notas Importantes

- Las vacaciones se calculan por periodo (año laboral)
- Los empleados PYME reciben 15 días/año
- Los empleados Régimen General reciben 30 días/año
- Las aprobaciones siguen la jerarquía organizacional

## 🆘 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contactar al equipo de desarrollo.

---

**Desarrollado para Prayaga** - Sistema de Gestión de Vacaciones
**Versión:** 1.0.0
**Año:** 2025
