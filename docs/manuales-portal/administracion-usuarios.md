# Administración de usuarios — Manual de uso

**Ruta:** `/admin-portal/usuarios`  
**Acceso:** Rol **admin** o correos autorizados en `REACT_APP_ADMIN_PORTAL_USUARIOS_EMAILS` (lista corporativa de gestores RRHH/TI).

## Objetivo

Crear y mantener **empleados**, credenciales, bloqueos y **módulos visibles** en el portal (`modulos_portal`).

## Listado

- Busca por nombre, correo o código.
- Abre un usuario para ver detalle en pestañas.

## Pestañas del detalle

| Pestaña | Acciones |
|---------|----------|
| Cuenta | Datos personales, área, cargo, rol, jefe, estado activo/bloqueado |
| Acceso a la plataforma | Interruptores por módulo del portal (vacaciones, cotizaciones, caja, etc.) |
| Vacaciones ganadas | Periodos ganados, días y estado (consulta/gestión según permiso) |

## Operaciones frecuentes

- **Nuevo usuario:** datos mínimos + rol; puede generarse contraseña segura.
- **Restablecer contraseña:** envía o fija nueva clave según flujo del botón.
- **Bloquear / desbloquear:** impide login sin borrar historial.
- **Eliminar permanente:** solo cuando la política lo permite; irreversible.
- **Guardar módulos:** define qué tarjetas y rutas ve el colaborador (etiqueta RESTRINGIDO en Inicio).

## Módulos del portal

Los IDs coinciden con `backend/src/constants/portalModulos.js` (vacaciones, boletas, cotizaciones, cierre-negocio, etc.). Si un módulo no aparece en Inicio tras activarlo, pide al usuario **cerrar sesión y volver a entrar**.

## Enlace desde el portal

Icono de usuario o tarjeta **Administración de usuarios** (solo si `esAdminPortalUsuarios()`).

## Solicitudes de registro

Las cuentas creadas vía **Solicitudes de registro** también se administran aquí después de aprobadas (ajuste de módulos y jefe).
