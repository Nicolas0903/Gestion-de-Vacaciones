# Archivo / Respaldos — Manual de uso

**Ruta:** `/archivo-respaldos`  
**Acceso:** Rol **admin** o **contadora** con módulo **archivo-respaldos**.

## Objetivo

Descargar **copias de seguridad** del portal: Excel legible por módulos y volcado **SQL** técnico de la base de datos.

## Respaldos automáticos

- Se generan **08:30** y **17:30** (hora Perú, `America/Lima`).
- Si SMTP está configurado, se envían por correo a destinatarios definidos en servidor (`BACKUP_EMAILS`).
- La pantalla muestra horarios y correos configurados en metadatos.

## Respaldos manuales

- **Respaldo ahora (mañana)** o **(tarde):** ejecuta el mismo job fuera de horario; pide confirmación.

## Descargar

En la tabla de historial, por cada ejecución:

| Tipo | Archivo |
|------|---------|
| Excel | Varias hojas con datos exportables por módulo |
| SQL | Dump para restauración técnica |

Estados posibles: **ok**, **parcial**, error (badge en la fila).

## Buenas prácticas

- Usa Excel para auditoría y análisis; SQL solo personal autorizado de TI.
- No compartas dumps SQL fuera de canales seguros de Prayaga.
