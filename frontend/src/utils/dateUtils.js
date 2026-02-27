import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
