# Cotizaciones — Manual de usuario

**Ruta en el portal:** `/cotizaciones`  
**Acceso:** Administradores del portal y **responsables de cotización** (lista corporativa). En Inicio aparece como **RESTRINGIDO**.

## 1. Propósito del documento

Describir el flujo completo de **elaboración de cotizaciones comerciales** en el portal: desde la solicitud comercial recibida hasta la propuesta versionada entregada al cliente, incluyendo dimensionamiento, costos y trazabilidad de cambios.

## 2. Perfiles de usuario

| Perfil | Qué puede hacer |
|--------|-----------------|
| Responsable de cotización | Ver bandeja de solicitudes asignadas, crear/editar cotizaciones, versionar |
| Administrador portal | Ver todas las solicitudes, gestionar cualquier cotización |
| Comercial (otro módulo) | Solo envía solicitud; no elabora aquí |

## 3. Acceso al módulo

1. Inicie sesión en el portal.
2. En **Operaciones y finanzas**, tarjeta **Cotizaciones** → **Abrir cotizaciones**.
3. Use **Guía de uso** (parte superior) para recordatorio rápido.

## 4. Objetivo del módulo

Elaborar propuestas formales con:

- Datos generales del cliente y proyecto.
- **Actividades** y perfiles (dimensionamiento).
- **Costos** (recursos, tipo de cambio, márgenes).
- **Propuesta** al cliente.
- **Historial de versiones** con usuario y diferencias.

## 5. Bandeja «Solicitudes para elaborar»

Aparece arriba del listado de cotizaciones.

| Acción | Descripción |
|--------|-------------|
| Ver solicitudes | Estado *Enviada al equipo* desde el módulo Solicitud de cotización |
| Alcance admin | Ve **todas** las solicitudes enviadas |
| Alcance responsable | Solo solicitudes donde fue elegido como responsable |
| Crear cotización | Crea borrador con datos iniciales; la solicitud pasa a *En elaboración* |
| Rechazar | Cancela la solicitud (*Cancelada*); puede indicar motivo |

## 6. Crear una cotización

### 6.1 Desde la bandeja

1. Localice la solicitud `SOL-COT-…`.
2. **Crear cotización**.
3. Revise cliente, proyecto y notas (incluyen referencia a la solicitud).

### 6.2 Desde cero

1. Botón **Nueva cotización**.
2. Complete cliente, proyecto, **tipo de proyecto** (catálogo SAP), responsables.
3. **Guardar** → se asigna código `COT-AÑO-###` y versión inicial.

## 7. Pestañas del editor

| Pestaña | Contenido principal |
|---------|---------------------|
| Información general | Cliente, proyecto, tipo, notas, estado comercial |
| Actividades | Perfiles, horas, % participación (debe sumar **100 %**) |
| Costos | Recursos, moneda, tipo de cambio SUNAT, márgenes |
| Propuesta | Texto y montos hacia el cliente |
| Versiones | Listado por versión; **Editado por**; diff al expandir |

## 8. Guardar y control de versiones

- **Guardar:** persiste el borrador. Si hay cambios respecto a la versión actual, el sistema **incrementa la versión** y registra su usuario.
- **Guardar con comentario / Nueva versión:** igual con comentario opcional en el historial.
- **Sin cambios:** no se crea versión duplicada.

## 9. Restaurar una versión anterior

1. Pestaña **Versiones**.
2. Elija la versión y **Restaurar**.
3. El contenido vuelve al snapshot; al **Guardar** se genera una **nueva** versión (no sobrescribe la historia).

## 10. Rechazo de solicitudes comerciales

Desde la bandeja, **Rechazar** deja la solicitud en *Cancelada*. El comercial la ve en su módulo de solicitudes.

## 11. Buenas prácticas

- Cuadre actividades y horas de perfiles antes de cerrar costos.
- Use tipo de cambio SUNAT desde la pestaña Costos cuando esté disponible.
- Revise versiones antes de enviar propuesta externa; el historial es evidencia interna.

## 12. Eliminación

La eliminación de cotizaciones aplica solo según política interna y permisos; use con precaución.

---

## Soporte

Reporte: módulo **Cotizaciones**, código `COT-…` o `SOL-COT-…`, acción y captura.

*Alineado con la guía en pantalla del portal.*
