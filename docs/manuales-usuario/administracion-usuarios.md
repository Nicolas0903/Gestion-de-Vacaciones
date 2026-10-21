# Administración de usuarios — Manual de usuario

**Ruta:** `/admin-portal/usuarios`  
**Acceso:** Rol **admin** o correos en lista **ADMIN_PORTAL_USUARIOS** (gestores RRHH/TI).

## 1. Propósito del documento

Gestionar **empleados**, **credenciales**, **bloqueos** y **módulos visibles** en el portal (`modulos_portal`).

## 2. Perfiles de usuario

Administradores del sistema y gestores de RRHH explícitamente autorizados (no toda contadora por defecto).

## 3. Acceso

Portal → icono usuario o tarjeta **Administración de usuarios**.

## 4. Listado

- Búsqueda por nombre, correo o código.
- Acciones masivas: eliminar, restablecer contraseña (según selección).

## 5. Detalle — pestaña Cuenta

Datos personales, área, cargo, **rol**, jefe directo, estado activo/bloqueado, alta de usuario nuevo.

## 6. Detalle — pestaña Acceso a la plataforma

Interruptores por **módulo del portal** (vacaciones, cotizaciones, caja, etc.):

- **Activado:** el colaborador ve la tarjeta y puede entrar.
- **Desactivado:** oculto o bloqueado (RESTRINGIDO en Inicio).

Tras cambios, el usuario puede necesitar **cerrar sesión y volver a entrar**.

## 7. Detalle — pestaña Vacaciones ganadas

Consulta y gestión de periodos ganados, días y estados (gozadas, pendiente, parcial).

## 8. Operaciones frecuentes

| Acción | Cuándo usarla |
|--------|----------------|
| Agregar usuario | Alta manual sin pasar por solicitud registro |
| Restablecer contraseña | Olvido o rotación |
| Bloquear | Suspender acceso sin borrar historial |
| Eliminar permanente | Solo según política — irreversible |

## 9. IDs de módulos

Coinciden con `portalModulos` en backend (vacaciones, boletas, cierre-negocio, etc.).

---

## Soporte

Módulo **Admin usuarios**, email del empleado afectado y captura.

*Alineado con la guía en pantalla del portal.*
