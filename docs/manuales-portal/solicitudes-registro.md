# Solicitudes de registro — Manual de uso

**Ruta:** `/admin/solicitudes-registro`  
**Acceso:** Módulo **solicitudes-registro** (habitualmente RRHH / administración).

## Objetivo

Aprobar o rechazar **cuentas nuevas** que completaron el formulario público de registro antes de acceder al portal.

## Bandeja

- Filtro **Pendientes** vs historial completo.
- Cada tarjeta muestra datos del solicitante: correo, teléfono, documento, cargo, fecha.

## Aprobar

1. Abre **Aprobar** en la solicitud.
2. Asigna **rol** en el sistema (empleado, jefe, contadora, etc.).
3. Opcional: **jefe directo** para flujos de vacaciones/aprobaciones.
4. Comentarios internos opcionales.
5. Confirma: el sistema crea la cuenta y envía **credenciales por correo**.

## Rechazar

1. **Rechazar** → motivo obligatorio.
2. El solicitante queda informado según el mensaje configurado en backend.

## Relación con registro público

Ruta de autoservicio (sin login): formulario **Solicitar registro** desde la pantalla de login. Hasta aprobar aquí, no hay acceso al portal.

## Portal

Visible en menú de administración o módulos restringidos según tu perfil; no aparece en tarjetas de Inicio para todo el personal.
