# Bolsa de horas (Control de proyectos) — Manual de usuario

**Ruta principal:** `/control-proyectos`  
**Reportes:** `/control-proyectos/reporte` (+ proyectos, actividades, locadores)  
**Acceso:** Módulo **control-proyectos** (mayoría del personal); gestión ampliada para gestores/admin.

## 1. Propósito del documento

Administrar **proyectos**, registrar **horas/actividades** del equipo y consultar **reportes** de capacidad y consumo de bolsa.

## 2. Perfiles de usuario

| Perfil | Funciones |
|--------|-----------|
| Consultor | Registrar actividades en proyectos asignados |
| Gestor de proyectos | Crear/editar proyectos, aprobar actividades |
| Admin | Costo hora, locadores (`/admin/control-proyectos-*`) |

## 3. Acceso

Portal → **Bolsa de Horas** → **Registrar actividad**. **Reportes** y **Gestionar** en la misma tarjeta (según permiso).

## 4. Registrar actividad

1. Busque **proyecto** (filtros: empresa, encargado, estado).
2. Abra el proyecto → **Nueva actividad**.
3. Indique inicio/fin (calcula horas) o **modo manual** de horas.
4. Descripción, consultores, estado de actividad.
5. Envíe; si aplica, queda **pendiente de aprobación**.

## 5. Aprobación de actividades

Gestores ven badge **Pendiente / Aprobada / Rechazada**. Aprueben o rechacen según política de bolsa.

## 6. Proyectos (gestores)

Campos típicos: empresa, nombre proyecto, encargado, consultores, fechas, estado (en curso, finalizado…), prioridad, situación de pago.

## 7. Reportes

| Ruta | Contenido |
|------|-----------|
| `/control-proyectos/reporte` | Dashboard resumen, horas por mes |
| `.../reporte/proyectos` | Por proyecto |
| `.../reporte/actividades` | Detalle actividades |
| `.../reporte/locadores` | Locadores / externos |

## 8. Configuración (solo admin)

- **Costo hora por proyecto**
- **Catálogo de locadores**

Enlaces desde **Gestionar** en portal o rutas `/admin/control-proyectos-costo-hora` y locadores.

---

## Soporte

Módulo **Bolsa de horas**, ID proyecto/actividad y captura.

*Alineado con la guía en pantalla del portal.*
