# Bolsa de horas (Control de proyectos) — Manual de uso

**Ruta principal:** `/control-proyectos`  
**Reportes:** `/control-proyectos/reporte` y subrutas (proyectos, actividades, locadores)

## Objetivo

Gestionar **proyectos comerciales**, registrar **actividades / horas** del equipo y consultar reportes de capacidad y consumo de bolsa.

## Colaborador — registrar actividad

1. Entra desde el portal → **Bolsa de Horas** → **Registrar actividad**.
2. Busca o filtra **proyectos** (empresa, encargado, estado).
3. En un proyecto, registra **actividad** con inicio/fin (o horas), descripción, consultores y estado.
4. Algunas actividades requieren **aprobación** (badge Pendiente / Aprobada / Rechazada).

## Gestores de proyectos

Usuarios con permiso de gestión (admin o correos configurados como gestores):

- Crear y editar proyectos (estado, prioridad, fechas, consultores asignados).
- Aprobar o rechazar actividades pendientes.
- Enlaces **Gestionar** en el portal hacia administración de costo hora y locadores (`/admin/control-proyectos-costo-hora`, `/admin/control-proyectos-locadores`) — solo **admin**.

## Reportes

Desde la tarjeta del portal: enlace **Reportes** o KPI de bolsa en Inicio.

| Ruta | Contenido |
|------|-----------|
| `/control-proyectos/reporte` | Dashboard resumen (horas por mes, totales) |
| `/control-proyectos/reporte/proyectos` | Vista por proyecto |
| `/control-proyectos/reporte/actividades` | Detalle de actividades |
| `/control-proyectos/reporte/locadores` | Horas por locador/consultor externo |

## Búsqueda

Usa el buscador interno con alcance (todos los campos, empresa, proyecto, fechas, etc.) para listas largas.

## Acceso

Módulo **control-proyectos** en el portal; la mayoría del personal lo tiene activo por defecto.
