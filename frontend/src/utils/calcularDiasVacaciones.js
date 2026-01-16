import { eachDayOfInterval, isWeekend, isFriday, addDays, parseISO } from 'date-fns';

/**
 * Calcula los días de vacaciones según la política de la empresa:
 * - Los días laborales (lunes a viernes) siempre cuentan.
 * - Si las vacaciones incluyen un VIERNES, el sábado y domingo de ese 
 *   fin de semana también cuentan (porque regresas el lunes).
 * - Si las vacaciones TERMINAN en viernes, se agregan automáticamente
 *   el sábado y domingo siguientes (porque regresarías el lunes).
 * 
 * Ejemplos:
 * - Viernes 26 dic = 3 días (vie + sáb + dom)
 * - Lunes 22 a Jueves 25 = 4 días (solo laborales)
 * - Lunes 22 a Viernes 26 = 7 días (5 laborales + sáb + dom)
 * - Lunes 22 a Lunes 29 = 8 días
 * 
 * @param {Date|string} fechaInicio - Fecha de inicio de vacaciones
 * @param {Date|string} fechaFin - Fecha de fin de vacaciones
 * @returns {Object} { diasTotales, diasLaborales, diasFinDeSemana, detalle }
 */
export function calcularDiasVacaciones(fechaInicio, fechaFin) {
  const inicio = typeof fechaInicio === 'string' ? parseISO(fechaInicio) : fechaInicio;
  let fin = typeof fechaFin === 'string' ? parseISO(fechaFin) : fechaFin;

  if (inicio > fin) {
    return { diasTotales: 0, diasLaborales: 0, diasFinDeSemana: 0, detalle: [] };
  }

  // Si el último día es viernes, extender hasta el domingo
  // porque técnicamente regresarías el lunes
  if (isFriday(fin)) {
    fin = addDays(fin, 2); // Extender hasta el domingo
  }

  // Obtener todos los días en el rango (ahora incluye el fin de semana si terminaba en viernes)
  const todosDias = eachDayOfInterval({ start: inicio, end: fin });
  
  // Primero, identificar todos los viernes en el rango
  const viernesEnRango = todosDias.filter(dia => isFriday(dia));
  
  // Crear un Set con los fines de semana que deben contar
  // (los que siguen a un viernes que está en el rango de vacaciones)
  const finesDeSemanaCuentan = new Set();
  
  viernesEnRango.forEach(viernes => {
    // El sábado y domingo después de este viernes cuentan
    const sabado = addDays(viernes, 1);
    const domingo = addDays(viernes, 2);
    finesDeSemanaCuentan.add(sabado.toISOString().split('T')[0]);
    finesDeSemanaCuentan.add(domingo.toISOString().split('T')[0]);
  });

  let diasContados = 0;
  let diasLaborales = 0;
  let diasFinDeSemana = 0;
  const detalle = [];

  todosDias.forEach((dia) => {
    const esFinDeSemana = isWeekend(dia);
    const fechaStr = dia.toISOString().split('T')[0];

    if (!esFinDeSemana) {
      // Día laboral (lunes a viernes) - siempre cuenta
      diasContados++;
      diasLaborales++;
      detalle.push({ fecha: dia, cuenta: true, tipo: 'laboral' });
    } else {
      // Es fin de semana - verificar si debe contar
      if (finesDeSemanaCuentan.has(fechaStr)) {
        diasContados++;
        diasFinDeSemana++;
        detalle.push({ fecha: dia, cuenta: true, tipo: 'fin_de_semana_cuenta' });
      } else {
        detalle.push({ fecha: dia, cuenta: false, tipo: 'fin_de_semana_no_cuenta' });
      }
    }
  });

  return {
    diasTotales: diasContados,
    diasLaborales,
    diasFinDeSemana,
    detalle
  };
}

/**
 * Versión simplificada que solo retorna el número de días
 */
export function contarDiasVacaciones(fechaInicio, fechaFin) {
  const resultado = calcularDiasVacaciones(fechaInicio, fechaFin);
  return resultado.diasTotales;
}

export default calcularDiasVacaciones;
