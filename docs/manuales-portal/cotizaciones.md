# Cotizaciones — Manual de uso

**Ruta:** `/cotizaciones`  
**Quién accede:** Administradores del portal y responsables de cotización (lista corporativa). Etiqueta **RESTRINGIDO** en el portal.

## Objetivo

Elaborar propuestas comerciales formales: información general, dimensionamiento (actividades/perfiles), costos, propuesta al cliente y **historial de versiones** por usuario.

## Bandeja de solicitudes comerciales

Arriba del listado aparece **Solicitudes para elaborar**:

- **Admin:** ve todas las solicitudes en estado *Enviada*.
- **Responsable asignado:** solo las donde fue elegido en la solicitud comercial.
- **Crear cotización:** toma la solicitud, crea un borrador con datos iniciales y pasa la solicitud a *En elaboración*.
- **Rechazar:** anula la solicitud (estado *Cancelada*); opcional motivo.

## Nueva cotización

1. Botón **Nueva cotización** o desde la bandeja.
2. Completa cliente, proyecto, tipo de proyecto (catálogo SAP), responsables.
3. Guarda; se crea código `COT-AÑO-###` y versión inicial.

## Pestañas del editor

| Pestaña | Contenido |
|---------|-----------|
| Información general | Cliente, proyecto, tipo, notas, estado |
| Actividades | Perfiles, horas, % participación (validación 100 %) |
| Costos | Recursos, moneda, tipo de cambio SUNAT, márgenes |
| Propuesta | Texto y montos hacia el cliente |
| Versiones | Historial **editado por**, clic para ver diff de cambios |

## Guardar y versiones

- **Guardar:** persiste borrador; si hay cambios respecto a la versión actual, **sube número de versión** automáticamente (con tu usuario).
- **Nueva versión / Guardar con comentario:** mismo flujo con comentario opcional.
- Sin cambios: no se duplica versión.

## Restaurar versión

En **Versiones**, **Restaurar** carga un snapshot anterior y genera una versión nueva al guardar.

## Eliminar cotización

Solo cuando corresponda por política interna; botón eliminar en la ficha (según permisos).

## Tips

- Dimensionamiento: las horas de perfiles deben cuadrar con actividades antes de guardar.
- Tipo de cambio: puedes tomar compra/venta SUNAT desde el módulo de costos.
- Solicitud vinculada: al crear desde bandeja, las notas incluyen código `SOL-COT-...`.
