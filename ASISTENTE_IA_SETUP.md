# Asistente IA del Admin — Setup

Chat con IA (Google Gemini) embebido como burbuja flotante para que el admin pueda
consultar información del sistema en lenguaje natural. **Versión 1: solo lectura.**

## Qué hace

El admin (Rocío, Nico, etc.) puede escribir cosas como:
- *"¿Cuántos días le quedan a Nicolás Valdivia en el período 2024-2025?"*
- *"Lista los permisos pendientes"*
- *"Muéstrame los descansos médicos de mayo"*
- *"¿Cuál es el email de Rocío Picón?"*

El bot busca, consulta y responde formateado con datos reales de la BD.

**Lo que NO hace (todavía):** modificar, crear ni borrar nada. Si el usuario lo pide,
el bot responde que esa funcionalidad llegará pronto.

## Quién lo ve

- Solo usuarios con rol `admin`.
- El componente está montado en `App.js` y se autocensura si el usuario no es admin.
- El endpoint del backend valida el rol antes de procesar (`router.use(verificarToken, verificarRol('admin'))`).

---

## Pasos para activarlo en el servidor

### 1. Obtener la API key de Gemini (gratis, sin tarjeta)

1. Entrar a https://aistudio.google.com/apikey con una cuenta de Google.
2. Click en **"Create API key"** → seleccionar un proyecto o crear uno nuevo.
3. Copiar la key (formato `AIzaSy...`).

> **Tier gratuito:** 1.500 requests/día con Gemini 2.5 Flash. Sobra de más para uso interno.

### 2. Pull del código en el servidor

```bash
cd /var/www/gestion-vacaciones
git pull origin main
```

### 3. Instalar la nueva dependencia del backend

```bash
cd backend
npm install
```

Esto instala `@google/genai` (SDK oficial de Gemini para Node.js).

> **Requisito**: Node.js 20+. Verificalo con `node --version`. Si tu servidor tiene
> una versión anterior, actualizá con `nvm install 20 && nvm use 20` o el método
> que uses para gestionar Node.

### 4. Agregar la API key al `.env` del backend

Editá `/var/www/gestion-vacaciones/backend/.env` y agregá al final:

```
GEMINI_API_KEY=AIzaSy...la_key_que_copiaste
```

(Opcional: `GEMINI_MODEL=gemini-2.5-flash` — el default ya es ese.)

### 5. Reiniciar el backend con PM2

```bash
pm2 restart gestor-vacaciones-backend --update-env
pm2 save
```

El flag `--update-env` hace que PM2 recargue las variables del `.env`.

### 6. Build del frontend

```bash
cd ../frontend
npm install   # por si hay deps nuevas (no las hay para este feature, pero por las dudas)
npm run build
```

Apache ya está sirviendo el directorio `frontend/build` (la VirtualHost no necesita
ningún cambio).

### 7. Verificación

Entrar a `http://96.126.124.60` con un usuario **admin**. Tiene que aparecer una
burbuja flotante en la esquina inferior derecha con el texto "Asistente IA" y un
ícono de chispas. Al hacer click:
- Se abre el panel de chat.
- Muestra sugerencias clickeables.
- Tipear: *"¿Cuántos días tiene asignados Nicolás Valdivia?"* → el bot busca y responde.

Si la burbuja no aparece, verificar:
- El usuario logueado es admin (`SELECT rol_nombre FROM ...`).
- El frontend fue rebuilt y Apache lo está sirviendo.

Si el chat se abre pero da error al enviar un mensaje:
- Backend logs: `pm2 logs gestor-vacaciones-backend --lines 50`.
- Probablemente la `GEMINI_API_KEY` está mal o faltó el restart con `--update-env`.

---

## Endpoints expuestos

| Método | Ruta                       | Auth          | Descripción                          |
|--------|----------------------------|---------------|--------------------------------------|
| GET    | `/api/asistente-ia/estado` | admin         | Estado del servicio (configurado, modelo, nivel). Útil para debug. |
| POST   | `/api/asistente-ia/mensaje`| admin         | Body: `{ mensaje, historial }`. Devuelve `{ respuesta, historial, acciones }`. |

---

## Funciones (tools) disponibles al modelo

El modelo Gemini puede invocar estas funciones internas según la pregunta:

| Función                       | Qué hace                                                |
|-------------------------------|---------------------------------------------------------|
| `buscarEmpleado`              | Busca por nombre/apellido/DNI/email                     |
| `obtenerEmpleado`             | Datos completos de un empleado por id                   |
| `listarPeriodosVacaciones`    | Todos los períodos de un empleado (con días gozados/pendientes) |
| `obtenerResumenVacaciones`    | Resumen total ganados/gozados/pendientes                |
| `listarPermisos`              | Permisos con filtros (empleado, estado, tipo, fechas)   |
| `listarPermisosPendientes`    | Permisos pendientes de aprobación globalmente           |
| `listarSolicitudesVacaciones` | Solicitudes con filtros (empleado, estado)              |

Todas son **read-only**. Implementadas en `backend/src/services/asistenteIaService.js`.

---

## Costos

| Concepto              | Costo                                        |
|-----------------------|----------------------------------------------|
| Gemini Flash (tier gratuito) | $0 hasta 1.500 requests/día            |
| Si superás el tier   | ~$0.10 USD por millón de tokens de entrada    |

Para uso interno (un admin haciendo 20-50 consultas/día) el costo real es **$0**.

---

## Limitaciones conocidas (v1)

1. **Solo lectura.** No modifica nada. La siguiente iteración (Nivel 2) agregará
   acciones de escritura con confirmación humana previa.
2. **El historial vive en localStorage del navegador.** Si el admin limpia el
   navegador o usa otro dispositivo, pierde el historial. No es un problema serio
   porque cada conversación es self-contained.
3. **No tiene memoria entre sesiones del mismo usuario** (más allá del localStorage).
4. **No procesa imágenes/PDFs.** Gemini Flash soporta multimodal, pero esta
   primera versión solo acepta texto. Si necesitás que lea constancias médicas,
   se puede activar en una iteración futura.

---

## Próximos pasos sugeridos (Nivel 2)

Cuando quieras dar el salto a "escritura confirmada":

1. Agregar tabla `auditoria_asistente_ia` (quién, cuándo, qué prompt, qué función, payload antes/después).
2. Crear funciones de escritura limitadas (ej. `actualizarDiasPeriodoVacaciones`).
3. Hacer que el LLM **proponga** la acción y espere confirmación del usuario (dos
   botones [Sí, aplicar] / [Cancelar]) antes de ejecutar.
4. Validaciones de negocio adicionales (no más de N días, no saldo negativo, etc.).

Tiempo estimado para Nivel 2: 5-7 días de trabajo.
