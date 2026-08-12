import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Datetimes de bolsa de horas se guardan en MySQL sin zona horaria (hora de pared Perú).
 * No deben interpretarse como UTC al mostrarlas.
 */
export function parseDatetimeBolsaHoras(fechaStr) {
  if (fechaStr == null || fechaStr === '') return null;
  const s = String(fechaStr).trim().replace(/\.\d{3}$/, '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formato pantalla: dd/MM/yyyy HH:mm (misma hora que el formulario de edición). */
export function formatoDatetimeBolsaHoras(fechaStr) {
  const d = parseDatetimeBolsaHoras(fechaStr);
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
}

/** Valor para input type="datetime-local". */
export function datetimeBolsaHorasALocalInput(fechaStr) {
  if (!fechaStr) return '';
  const s = String(fechaStr).trim();
  if (s.includes('T')) return s.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.replace(' ', 'T').slice(0, 16);
  return '';
}
