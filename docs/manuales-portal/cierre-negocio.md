# Cierre de negocio — Manual de uso

**Ruta:** `/cierre-negocio`  
**Acceso:** Restringido (rol **admin** y módulo **cierre-negocio**; despliegue según ambiente).

## Objetivo

Seguimiento **post-venta** del negocio cerrado: reporte inicial, actividades, cronograma, hojas de costo y utilidad, alineado con la cotización cuando existe vínculo.

## Flujo básico

1. **Nuevo cierre** → elige cotización final (si aplica) o registro histórico sin cotización.
2. Se genera un **código de cierre**; aparece en la lista lateral.
3. Selecciona el cierre y navega por las vistas.

## Vistas del editor

| Vista | Contenido |
|-------|-----------|
| Cierre de negocio | Reporte tipo Excel / resumen ejecutivo del cierre |
| Actividades | Detalle de actividades del proyecto vendido |
| Cronograma | Planificación temporal |
| Hojas de costo | Costos, facturación y utilidad (guardar desde aquí) |
| Editar | Datos generales del cierre (cliente, proyecto, estado) |

## Estados y vínculos

- Si hay **cotización vinculada**, verás el código `COT-…` en el listado.
- Sin cotización: etiqueta **Histórico** (migraciones o cierres anteriores al portal).
- **Status cierre** (p. ej. inicial) indica avance del seguimiento.

## Eliminar

Botón **Eliminar** en la ficha: acción irreversible; confirma en el diálogo.

## Portal

Tarjeta **Cierre de Negocio** → **Ver cierres** (solo usuarios autorizados).
