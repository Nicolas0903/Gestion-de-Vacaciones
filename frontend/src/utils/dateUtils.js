import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parsea una fecha ISO evitando problemas de zona horaria.
 * Agrega T12:00:00 para que la fecha siempre quede en el día correcto
 * independientemente de la zona horaria del usuario.
 */
export const parseFechaSegura = (fechaString) => {
  if (!fechaString) return null;
  
  // Si ya tiene hora, usar parseISO directo
  if (fechaString.includes('T') || fechaString.includes(' ')) {
    return parseISO(fechaString);
  }
  
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de zona horaria
  return parseISO(fechaString + 'T12:00:00');
};

/**
 * Formatea una fecha de forma segura
 */
export const formatFechaSegura = (fechaString, formato = "d MMM yyyy") => {
  const fecha = parseFechaSegura(fechaString);
  if (!fecha) return 'N/A';
  return format(fecha, formato, { locale: es });
};
