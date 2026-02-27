import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parsea una fecha de forma segura (maneja null, undefined, strings).
 * Para fechas con hora del servidor (ej. "2025-01-15 20:24:00") añade Z (UTC).
 * Para fechas solo día (ej. "2025-01-15") se interpreta como fecha local.
 */
export function parseFechaSegura(fechaStr) {
  if (fechaStr == null || fechaStr === '') return new Date();
  if (fechaStr instanceof Date) return isNaN(fechaStr.getTime()) ? new Date() : fechaStr;
  try {
    const str = String(fechaStr).trim();
    let conZona = str;
    if (!str.includes('Z')) {
      conZona = str.replace(' ', 'T').replace(/\.\d{3}$/, '');
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(conZona)) conZona += 'Z';
    }
    const fecha = new Date(conZona);
    return isNaN(fecha.getTime()) ? new Date() : fecha;
  } catch {
    return new Date();
  }
}

/**
 * Parsea una fecha que viene del servidor (UTC) y la formatea correctamente.
 * MySQL devuelve "2026-02-26 20:24:00" sin zona horaria - se interpreta como UTC.
 * Así se muestra en la zona horaria local del usuario (ej: Perú = UTC-5).
 */
export function formatearFechaServidor(fechaStr, formato = 'dd/MM/yyyy HH:mm') {
  if (!fechaStr) return '-';
  try {
    const str = String(fechaStr);
    const conZona = str.includes('Z') ? str : str.replace(' ', 'T').replace(/\.\d{3}$/, '') + 'Z';
    const fecha = new Date(conZona);
    return isNaN(fecha.getTime()) ? '-' : format(fecha, formato, { locale: es });
  } catch {
    return '-';
  }
}
