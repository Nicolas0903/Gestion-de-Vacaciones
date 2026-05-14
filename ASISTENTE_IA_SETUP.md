# Asistente IA del Admin — Setup

Chat con IA (Groq + Llama 3.3 70B) embebido como burbuja flotante para que el admin pueda
consultar información del sistema en lenguaje natural. **Versión 1: solo lectura.**

## Qué hace

El admin (Rocío, Nico, etc.) puede escribir cosas como:
- *"¿Cuántos días le quedan a Nicolás Valdivia en el período 2024-2025?"*
- *"Lista los permisos pendientes de aprobar"*
- *"Muéstrame los reembolsos pendientes"*
- *"¿Qué hay pendiente en el sistema?"*
- *"Lista los proyectos del módulo Bolsa de Horas de Verónica"*
- *"¿Hay solicitudes de registro nuevas?"*
- *"Detalle de caja chica del mes pasado"*

El bot busca, consulta y responde formateado con datos reales de la BD.

**Lo que NO hace (todavía):** modificar, crear ni borrar nada. Si el usuario lo pide,
el bot responde que esa funcionalidad llegará pronto.

## Quién lo ve

- Solo usuarios con rol `admin`.
- Componente montado en `App.js`, se autocensura si el usuario no es admin.
- El endpoint backend valida el rol antes de procesar (`router.use(verificarToken, verificarRol('admin'))`).

---

## Por qué Groq y no Gemini

En 2026 Google redujo drásticamente el tier gratuito de Gemini (20 requests/día). Groq
ofrece **1.000 req/día y 30 req/min** completamente gratis, sin tarjeta, suficiente para
uso interno de varios admins. Además es ultra rápido (<500ms por respuesta).

| Proveedor       | Requests/día (gratis) | RPM | Velocidad |
|-----------------|----------------------|-----|-----------|
| Gemini Free     | 20 ❌                 | 5   | 1-2 s     |
| **Groq Free**   | **1.000** ✅          | 30  | <500ms    |

---

## Pasos para activarlo en el servidor

### 1. Obtener la API key de Groq (gratis, sin tarjeta)

1. Entrar a https://console.groq.com con una cuenta Google/Github.
2. Ir a **API Keys** → **Create API Key**.
3. Copiar la key (formato `gsk_...`).

### 2. Pull del código en el servidor

```bash
cd /var/www/gestion-vacaciones
git pull origin main
```

### 3. Instalar dependencias del backend (cambió la dep)

```bash
cd backend
npm install
```

Esto **elimina** `@google/genai` (Gemini, ya no se usa) e **instala** `groq-sdk`.

> **Requisito**: Node.js 20+. Verificalo con `node --version`.

### 4. Reemplazar la API key en `.env`

Editá `/var/www/gestion-vacaciones/backend/.env`:

- **Quitá** la línea vieja `GEMINI_API_KEY=...` (si la tenías).
- **Agregá** la nueva línea:

```
GROQ_API_KEY=gsk_tu_key_de_groq
```

### 5. Restart del backend

```bash
pm2 restart gestor-vacaciones-backend --update-env
pm2 save
```

### 6. Rebuild del frontend

```bash
cd ../frontend
npm run build
```

Apache ya está sirviendo `frontend/build`, sin cambios.

### 7. Verificación

Entrá a `http://96.126.124.60` con un usuario **admin**. La burbuja aparece abajo a la
derecha. Tirá una consulta como *"¿Qué hay pendiente en el sistema?"* — el bot debería
llamar `obtenerContextoSistema` y responder con un resumen general.

---

## Funciones (tools) disponibles al modelo

Total: **15 funciones**, todas **read-only**.

| Función | Módulo | Para qué |
|---|---|---|
| `obtenerContextoSistema` | General | Foto general (empleados activos, pendientes por módulo) |
| `buscarEmpleado` | Empleados | Búsqueda fuzzy por nombre/apellido/DNI/email |
| `obtenerEmpleado` | Empleados | Datos completos de un empleado |
| `listarEmpleadosTodos` | Empleados | Lista con filtro por rol (admin, contadora, etc.) |
| `listarPeriodosVacaciones` | Vacaciones | Todos los períodos de un empleado |
| `obtenerResumenVacaciones` | Vacaciones | Total ganados/gozados/pendientes |
| `listarSolicitudesVacaciones` | Vacaciones | Solicitudes con filtros |
| `listarPermisos` | Permisos | Permisos con filtros (estado, tipo, fechas) |
| `listarPermisosPendientes` | Permisos | Backlog global de permisos pendientes |
| `listarBoletas` | Boletas | Boletas de un empleado, opcional por año |
| `listarReembolsos` | Reembolsos | Reembolsos con filtros (empleado, estado) |
| `listarPeriodosCajaChica` | Caja Chica | Períodos disponibles |
| `obtenerDetallesCajaChica` | Caja Chica | Ingresos detallados de un período |
| `listarProyectosControl` | Proyectos | Proyectos del módulo Bolsa de Horas |
| `listarSolicitudesRegistro` | Registros | Solicitudes pendientes de aprobación |

Todas en `backend/src/services/asistenteIaService.js`.

---

## Endpoints

| Método | Ruta                       | Auth          | Descripción |
|--------|----------------------------|---------------|-------------|
| GET    | `/api/asistente-ia/estado` | admin         | Devuelve `{ configurado, proveedor, modelo, nivel }` |
| POST   | `/api/asistente-ia/mensaje`| admin         | Body: `{ mensaje, historial }`. Devuelve `{ respuesta, historial, acciones }` |

Formato del historial (OpenAI-compatible):

```json
[
  { "role": "user",      "content": "Hola" },
  { "role": "assistant", "content": "Hola, ¿en qué te ayudo?" }
]
```

---

## Costos

| Concepto                              | Costo                              |
|---------------------------------------|------------------------------------|
| Groq Free Tier (Llama 3.3 70B)        | $0 hasta 1.000 requests/día        |
| Si superás el free                    | ~$0.59/M tokens entrada (developer plan) |

Para uso interno (admin con 30-50 consultas/día) el costo real es **$0**.

---

## Limitaciones conocidas (v1)

1. **Solo lectura.** No modifica nada. El Nivel 2 agregará acciones de escritura con confirmación humana previa.
2. **Historial en localStorage del navegador.** Si se limpia el navegador, se pierde. No es problema porque cada conversación es self-contained.
3. **Sin multimodal.** Esta primera versión solo procesa texto (Groq tampoco lo soporta hoy).
4. **TPM limitado** (6K tokens/min en free). Si el modelo hace ráfagas de 5+ function calls seguidos puede toparse momentáneamente con el límite. El error se muestra y al retry pasa.

---

## Migración desde Gemini (si venís de la versión previa)

Si ya habías hecho deploy con Gemini:

1. En `.env`: cambiar `GEMINI_API_KEY=...` por `GROQ_API_KEY=...`.
2. `git pull && cd backend && npm install` (esto remueve `@google/genai` y agrega `groq-sdk`).
3. `pm2 restart gestor-vacaciones-backend --update-env`.
4. `cd ../frontend && npm run build`.

El historial viejo del localStorage del frontend se migra automáticamente al primer load.

---

## Próximos pasos sugeridos (Nivel 2)

1. Agregar tabla `auditoria_asistente_ia` (quién, cuándo, prompt, función, payload antes/después).
2. Crear funciones de escritura limitadas (ej. `actualizarDiasPeriodoVacaciones`).
3. Hacer que el LLM proponga la acción y espere confirmación del usuario antes de ejecutar.
4. Validaciones de negocio adicionales (no más de N días, no saldo negativo, etc.).

Tiempo estimado para Nivel 2: 5-7 días de trabajo.
