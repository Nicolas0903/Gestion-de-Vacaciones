# Archivo / respaldos — Manual de usuario

**Ruta:** `/archivo-respaldos`  
**Acceso:** Rol **admin** o **contadora** + módulo **archivo-respaldos**.

## 1. Propósito del documento

Descargar **copias de seguridad** del portal: Excel legible por módulos y volcado **SQL** de la base de datos.

## 2. Perfiles de usuario

TI, contabilidad o administradores autorizados.

## 3. Acceso

Portal → módulo **Archivo / Respaldos** (según menú o tarjeta restringida).

## 4. Respaldos automáticos

- Horario: **08:30** y **17:30** (hora Perú, `America/Lima`).
- Correo off-site si SMTP y `BACKUP_EMAILS` están configurados en servidor.
- La pantalla muestra horarios y destinatarios.

## 5. Respaldos manuales

- **Respaldo ahora (mañana)** o **(tarde):** ejecuta job fuera de horario; pide confirmación.

## 6. Descargar desde historial

| Tipo | Uso |
|------|-----|
| Excel | Auditoría, lectura por hojas/módulo |
| SQL | Restauración técnica — solo TI autorizado |

Estados: **ok**, **parcial**, error (badge en fila).

## 7. Seguridad

No comparta dumps SQL por medios personales. Excel puede contener datos personales — tratar como confidencial.

---

## Soporte

Módulo **Respaldos**, ID ejecución y tipo de archivo fallido.

*Alineado con la guía en pantalla del portal.*
