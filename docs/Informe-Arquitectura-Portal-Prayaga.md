# Informe técnico de arquitectura — Portal de Prayaga

**Repositorio:** Nicolas0903/Gestion-de-Vacaciones  
**Alcance:** Análisis basado en código fuente y documentación del repo. No se implementó integración con Talent Hub.  
**Fecha de análisis:** Octubre 2026

---

## A. Resumen ejecutivo

**HECHO VERIFICADO:** Portal de Prayaga es una aplicación web empresarial monolítica compuesta por un SPA React 18 y una API REST Express sobre MySQL (mysql2, SQL parametrizado, sin ORM). El punto de entrada del hub es `/portal`, que agrega 14 módulos funcionales (vacaciones, boletas, permisos, reembolsos, rendiciones, caja, proveedores, bolsa de horas, comisiones, consumo Fabric, respaldos, etc.) con control de acceso por JWT + rol + mapa JSON `modulos_portal` por empleado.

**HECHO VERIFICADO:** El sistema nació como gestor de vacaciones y evolucionó a portal interno multi-módulo. La identidad central es la entidad `empleados`, correlacionable por `id`, `codigo_empleado`, `email` y `dni`.

**HECHO VERIFICADO:** No existe contrato OpenAPI, GraphQL, colas de mensajes ni webhooks salientes formales. Las integraciones externas verificadas son SMTP (Office 365), Groq (asistente IA), Power BI embebido (solo frontend), mysqldump para respaldos y parseo local de Excel (Fabric PAYG).

**INFERENCIA:** Para integración futura con Talent Hub, los puntos más reutilizables son: autenticación JWT existente, catálogo de empleados/roles, APIs de vacaciones/permisos/bolsa de horas, y el modelo `modulos_portal`. Los mayores riesgos de integración son la autorización dual (rol + JSON + listas de email hardcodeadas) y la ausencia de API versionada/documentada.

**DESCONOCIDO:** Contenido, stack y contratos de Talent Hub (explícitamente fuera de alcance).

---

## B. Stack tecnológico y estructura del proyecto

### B.1 Stack

| Capa | Tecnología | Evidencia |
|------|------------|-----------|
| Frontend | React 18.2, React Router 6.21, CRA 5 | frontend/package.json |
| Estilos | Tailwind CSS 3.4, Headless UI, Heroicons | frontend/package.json |
| HTTP cliente | Axios 1.6 | frontend/src/services/api.js |
| Estado global | Solo AuthContext (sin Redux) | frontend/src/context/AuthContext.js |
| Backend | Node.js, Express 4.18 | backend/package.json |
| BD runtime | MySQL vía mysql2 pool | backend/src/config/database.js |
| Auth | JWT, bcrypt | backend/src/config/jwt.js |
| Jobs | node-cron | backupScheduler.js, bolsaHorasReporteScheduler.js |
| Email | Nodemailer | backend/src/services/emailService.js |
| IA | Groq SDK | backend/src/services/asistenteIaService.js |

**HECHO VERIFICADO:** `pg` está en dependencias y existe schema-postgresql.sql, pero no hay imports de pg en backend/src/ — runtime actual es MySQL.

**INFERENCIA:** README menciona PostgreSQL en producción; docs Linode usan MySQL — posible documentación desactualizada.

### B.2 Estructura del repositorio

```
gestor-vacaciones/
├── frontend/          # SPA React (build → /var/www/html)
│   ├── src/pages/     # 38 páginas por módulo
│   ├── src/components/
│   ├── src/context/   # AuthContext
│   └── src/services/  # api.js (axios)
├── backend/
│   ├── src/index.js   # Entry point
│   ├── src/routes/    # Routers Express
│   ├── src/controllers/
│   ├── src/models/    # 28 clases SQL
│   ├── src/services/
│   ├── sql/           # 52 scripts SQL manuales
│   └── uploads/       # Archivos subidos
├── scripts/
└── docs deploy: DEPLOYMENT_LINODE.md, URL_SIN_PREFIJO.md
```

**HECHO VERIFICADO:** Git remote origin → Nicolas0903/Gestion-de-Vacaciones.git, rama main.

---

## C. Arquitectura actual

### C.1 Diagrama de componentes (Mermaid — texto)

```
[Navegador React SPA] → [Apache /var/www/html] + [/api → Express :3002]
Express → [JWT + roles + modulos_portal] → [Models mysql2] → [MySQL]
Express → [uploads/] | [SMTP] | [Groq API]
Frontend -.-> [Power BI embed URL]
```

### C.2 Patrón arquitectónico

**HECHO VERIFICADO:** Monolito en capas Routes → Controllers → Models/Services, con middleware transversal (auth, módulo portal, multer).

**HECHO VERIFICADO:** Frontend modular por rutas; layout anidado persistente en `/vacaciones/*` (Layout.js); resto de módulos son páginas standalone.

---

## D. Mapa funcional y flujos de negocio

### D.1 Propósito

**HECHO VERIFICADO:** Portal interno de Prayaga para empleados y administradores: RRHH (vacaciones, permisos, boletas), finanzas (reembolsos, rendiciones, caja), operaciones (proveedores), proyectos (bolsa de horas), analítica (comisiones, Fabric, asistencia vía Power BI), y administración (usuarios, respaldos, registro).

### D.2 Catálogo de módulos (modulos_portal)

**HECHO VERIFICADO** — backend/src/constants/portalModulos.js:

| ID módulo | Función |
|-----------|---------|
| vacaciones | Solicitudes, aprobaciones, calendario, períodos |
| boletas | Consulta/firma; gestión admin |
| permisos | Permisos y descansos médicos |
| reembolsos | Reintegros de gastos |
| rendicion-presupuesto | Rendición por área |
| asistencia | Embed Power BI (sin API propia) |
| caja-chica | Periodos mensuales caja chica |
| caja-rendicion | Depósitos rendiciones aprobadas |
| solicitudes-registro | Alta de nuevas cuentas |
| control-proyectos | Bolsa de horas, proyectos, actividades |
| proveedores | Catálogo, evaluaciones, reevaluaciones |
| archivo-respaldos | Excel + SQL dumps programados |
| comisiones-por-pagar | Comisiones y pagos |
| consumo-fabric | Cargas PAYG Excel, montos mensuales |

### D.3 Roles

**HECHO VERIFICADO** — backend/sql/schema.sql:

| Rol | nivel_aprobacion | Uso típico |
|-----|------------------|------------|
| admin | 3 | Acceso amplio, gestión usuarios |
| contadora | 2 | Aprobaciones, boletas, permisos |
| jefe_operaciones | 1 | Aprobación vacaciones (fase jefe) |
| empleado | 0 | Colaborador estándar |
| practicante | 0 | Colaborador limitado |

**HECHO VERIFICADO:** Además del rol, hay listas de email hardcodeadas en portalAcceso.js y AuthContext.js.

### D.4 Flujo solicitud de vacaciones

Estados: borrador → pendiente_jefe → pendiente_contadora → aprobada | rechazada | cancelada. Aprobación multi-nivel vía aprobaciones y tokens email (tokens_aprobacion).

### D.5 Funcionalidades parciales

| Funcionalidad | Estado | Evidencia |
|---------------|--------|-----------|
| Reporte asistencia | Parcial — iframe Power BI | ReporteAsistencia.js |
| Asistente IA | Implementado — Groq read-only | asistenteIaService.js |
| PostgreSQL prod | No verificado en runtime | pg sin uso en src/ |
| Tests automatizados | Declarados, no implementados | jest sin archivos test |
| OpenAPI/Swagger | Ausente | — |
| SSO/OIDC | Ausente | solo JWT propio |

---

## E. Frontend y backend

### E.1 Frontend

- Entry: frontend/src/index.js → App.js
- Hub: /portal (Portal.js + PortalResumenDashboard.js)
- Vacaciones: /vacaciones/* con Layout.js
- Protección: ProtectedRoute, ModuloPortalRoute, AdminPortalUsuariosRoute
- HTTP: frontend/src/services/api.js — Bearer token, 401 → logout
- Estado: AuthContext + estado local por página

### E.2 Backend

- Entry: backend/src/index.js — montaje app.use('/api', routes)
- Middleware: autenticar, verificarRol, verificarAccesoModuloPortal, multer
- Cron jobs: backups (08:30/17:30), reporte bolsa horas (viernes 09:00), pendientes semanal (lunes 08:00)

---

## F. Catálogo de APIs e integraciones

**Prefijo base:** /api | **Auth default:** Authorization: Bearer JWT

### F.1 Health

| Método | Ruta | Auth | Propósito |
|--------|------|------|-----------|
| GET | /api/health | Pública | Status OK, módulos flags |

### F.2 Autenticación (/api/auth)

| Método | Ruta | Propósito |
|--------|------|-----------|
| POST | /login | Email + password → JWT |
| GET | /perfil | Usuario actual + modulos_portal |
| PUT | /cambiar-password | Cambio contraseña |
| POST | /refrescar-token | Renovar token |
| POST | /recuperar-password | Email reset |
| POST | /restablecer-password | Token + nueva password |
| POST | /solicitar-registro | Alta pendiente |

### F.3 Admin portal usuarios (/api/admin-portal-usuarios)

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | /empleados | Listado con acceso detalle |
| GET | /empleados/:id | Detalle + editor módulos |
| POST | /empleados | Alta |
| PUT | /empleados/:id/modulos-portal | Mapa {moduloId: bool} |
| PUT | /empleados/:id/bloquear | Desactivar |
| GET | /modulos-catalogo | 14 módulos |

### F.4 Vacaciones (/api/solicitudes, /api/periodos)

CRUD solicitudes, enviar, apelar, cancelar, calendario, aprobación por nivel, resumen períodos.

### F.5 Módulos financieros

| Prefijo | Operaciones |
|---------|-------------|
| /api/reembolsos | CRUD + aprobar/rechazar + adjuntos |
| /api/rendiciones-presupuesto | Similar + consulta RUC |
| /api/caja-chica | Periodos, ingresos, PDF, email |
| /api/caja-rendicion | Depósitos por periodo |

### F.6 Bolsa de horas (/api/control-proyectos)

CRUD proyectos/actividades, reporte dashboard, aprobación actividades locadores.

### F.7 Otros

/api/boletas, /api/permisos, /api/proveedores, /api/comisiones-por-pagar, /api/consumo-fabric, /api/backups, /api/notificaciones, /api/asistente-ia

### F.8 Rutas públicas (sin JWT)

/api/auth/login, recuperación password, /api/aprobacion-email/*, análogos reembolso/rendición/actividad.

### F.9 Integraciones externas

| Sistema | Tipo | Evidencia |
|---------|------|-----------|
| Office 365 SMTP | Saliente | emailService.js |
| Groq | Saliente API | asistenteIaService.js |
| Power BI | Embed frontend | ReporteAsistencia.js |
| Microsoft Fabric | Import Excel | consumoFabricPaygParser.js |
| mysqldump | Proceso hijo | backupArchivoService.js |

**HECHO VERIFICADO:** No hay OpenAPI, GraphQL ni contrato versionado (/v1/).

---

## G. Modelo de datos

### G.1 Motor

**HECHO VERIFICADO:** MySQL runtime. 52 scripts SQL en backend/sql/ — aplicación manual, sin runner de migraciones.

### G.2 Entidad empleados (identidad maestra)

| Campo | Notas |
|-------|-------|
| id (PK) | Identificador principal |
| codigo_empleado | UNIQUE, prefijo rol |
| email | UNIQUE, login |
| dni | UNIQUE |
| rol_id | FK → roles |
| jefe_id | FK self, jerarquía |
| modulos_portal | JSON { "vacaciones": true, ... } |
| activo | boolean |
| area | ENUM área organizacional |

### G.3 Otras entidades centrales

- periodos_vacaciones / solicitudes_vacaciones — workflow multi-estado
- cp_proyectos / cp_actividades / cp_proyecto_consultores — bolsa de horas
- tokens_aprobacion, tokens_reembolso, tokens_rendicion_presupuesto — aprobación email

### G.4 Código vs BD real

**HECHO VERIFICADO:** Esquema en código/SQL = verdad declarativa.  
**DESCONOCIDO:** Scripts SQL aplicados en producción (96.126.124.60).

---

## H. Identidad, autenticación, autorización y seguridad

### H.1 Autenticación

**HECHO VERIFICADO:** Login email/password → JWT. Token + usuario en localStorage. No SSO/OAuth/OIDC.

### H.2 Autorización (triple capa)

1. Rol (verificarRol, nivel_aprobacion)
2. Módulo portal (modulos_portal JSON)
3. Listas email hardcodeadas (portalAcceso.js)

### H.3 Controles de seguridad

| Control | Estado |
|---------|--------|
| Password hashing bcrypt | Sí |
| JWT Bearer | Sí |
| CORS FRONTEND_URL | Sí |
| CSRF explícito | No |
| Rate limiting | No verificado |
| Auditoría | Parcial (historial_vacaciones) |

### H.4 Riesgos identidad compartida con Talent Hub

| Riesgo | Impacto |
|--------|---------|
| JWT propio no federado | Alto |
| modulos_portal acoplado a Portal | Medio |
| Emails hardcodeados | Alto |
| Múltiples identificadores (id, codigo, email, dni) | Medio |

---

## I. Infraestructura, ambientes y despliegue

### I.1 Documentado

- VPS Linode/Akamai, Ubuntu, Apache
- Frontend: /var/www/html | Backend PM2 puerto 3002
- Proxy Apache: /api → localhost
- IP documentada: 96.126.124.60

### I.2 Deploy frontend (práctica operativa)

1. npm run build en PC (servidor se cuelga por RAM)
2. Zip build/* → scp a /tmp/
3. unzip → /var/www/html/
4. pm2 restart gestor-vacaciones-backend

### I.3 Variables de entorno (nombres)

Backend: PORT, NODE_ENV, DB_*, JWT_*, SMTP_*, FRONTEND_URL, GROQ_*, BACKUP_*, BOLSA_HORAS_*, etc.  
Frontend: REACT_APP_API_URL, REACT_APP_ADMIN_PORTAL_USUARIOS_EMAILS, etc.

### I.4 Ausencias

Sin Docker, sin CI/CD (.github/workflows), sin Kubernetes/terraform en repo.

---

## J. Pruebas, calidad, observabilidad y operación

- Tests: jest/react-scripts declarados, sin archivos *.test.js
- ESLint vía CRA en build
- Logging: console.log en index.js
- Health: GET /api/health (no valida BD)
- Comandos: npm run dev (backend), npm start (frontend), npm run build, pm2 start

---

## K. Capacidades reutilizables para integración con Talent Hub

> No se asume qué es Talent Hub.

### K.1 APIs candidatas

| Dominio | API | Utilidad potencial |
|---------|-----|-------------------|
| Identidad | /auth/perfil, /admin-portal-usuarios/empleados | Sync usuarios |
| Vacaciones | /periodos/mi-resumen, /solicitudes/* | Ausencias |
| Permisos | /permisos/mis-permisos | Ausencias médicas |
| Bolsa horas | /control-proyectos/reporte | Capacidad/horas |
| Organización | empleados.area, jefe_id, roles | Jerarquía |

### K.2 Dependencias internas (no exponer)

Tokens aprobación email, cron backups, parseo Excel Fabric, asistente IA Groq, archivos uploads/.

### K.3 Identificadores para correlación

empleados.id, codigo_empleado, email, dni — acordar con Talent Hub cuál es maestro.

### K.4 Requisitos a confirmar

1. Modelo identidad Talent Hub
2. Fuente de verdad usuarios
3. Permisos: modulos_portal vs RBAC propio TH
4. Contrato API (REST versionada, eventos, ETL)
5. Ambientes, CORS, JWT compartido o federation
6. Datos sensibles (boletas, permisos médicos)
7. Estado BD producción vs repo

---

## L. Riesgos priorizados

| # | Riesgo | Prob. | Impacto | Evidencia |
|---|--------|-------|---------|-----------|
| 1 | Autorización inconsistente (rol + JSON + emails) | Alta | Alta | portalAcceso.js |
| 2 | Sin API versionada/documentada | Alta | Alta | No OpenAPI |
| 3 | Esquema BD drift (52 SQL manuales) | Media | Alta | backend/sql/ |
| 4 | JWT no federado | Alta | Media | jwt.js |
| 5 | Deploy manual sin CI | Media | Media | No workflows |
| 6 | Sin tests automatizados | Alta | Media | No test files |
| 7 | Nombre BD inconsistente docs | Media | Baja | gestor_vacaciones vs gestorvacaciones |
| 8 | Rutas públicas token email | Baja | Media | aprobacion-*-email |
| 9 | Health no valida BD | Media | Baja | /health |
| 10 | Build frontend fuera de servidor | Media | Baja | Práctica operativa |

---

## M. Hechos, inferencias, desconocidos y preguntas

### Hechos verificados

Monolito React + Express + MySQL. 14 módulos portal. JWT + roles. ~28 modelos, 52 SQL. Cron backups/reportes. Integraciones SMTP, Groq, Power BI, mysqldump. Deploy Apache + PM2.

### Inferencias

PostgreSQL no usado en runtime. Integración TH requiere capa identidad acordada.

### Desconocidos

Arquitectura Talent Hub. Estado BD prod. TLS/WAF. Volumetría.

### Preguntas pendientes

1. ¿Qué datos debe consumir Talent Hub?
2. ¿TH o Portal es maestro de empleados?
3. ¿SSO único o APIs server-to-server?
4. ¿Lectura vs escritura cruzada?
5. ¿Requisitos legales datos RRHH?

---

## N. Inventario de archivos de evidencia

- backend/package.json, frontend/package.json
- backend/src/index.js, routes/index.js, config/database.js, config/jwt.js
- backend/.env.example
- frontend/src/App.js, services/api.js, context/AuthContext.js
- backend/src/utils/portalAcceso.js, constants/portalModulos.js
- backend/src/middleware/auth.js, moduloPortal.js
- frontend/src/pages/Portal.js, ReporteAsistencia.js
- backend/sql/schema.sql, control_proyectos.sql
- DEPLOYMENT_LINODE.md, URL_SIN_PREFIJO.md, README.md
- backend/src/routes/auth.js, solicitudes.js, controlProyectos.js, adminPortalUsuarios.js
