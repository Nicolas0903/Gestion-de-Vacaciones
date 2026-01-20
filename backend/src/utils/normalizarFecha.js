/**
 * Normaliza una fecha para evitar problemas de zona horaria
 * Convierte "2026-01-21" en un objeto Date a las 12:00 del mediodía
 * para evitar que se guarde el día anterior por diferencias de zona horaria
 * 
 * @param {string} fechaString - Fecha en formato YYYY-MM-DD
 * @returns {string} - Fecha en formato YYYY-MM-DD sin cambios
 */
function normalizarFecha(fechaString) {
  if (!fechaString) return null;
  
  // Si ya es una fecha válida en formato YYYY-MM-DD, la devolvemos tal cual
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(fechaString)) {
    return fechaString;
  }
  
  // Si es un objeto Date, lo convertimos a YYYY-MM-DD
  if (fechaString instanceof Date) {
    const year = fechaString.getFullYear();
    const month = String(fechaString.getMonth() + 1).padStart(2, '0');
    const day = String(fechaString.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return fechaString;
}

module.exports = { normalizarFecha };
