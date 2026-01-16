const moment = require('moment');

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
 * @param {string|Date} fechaInicio - Fecha de inicio de vacaciones
 * @param {string|Date} fechaFin - Fecha de fin de vacaciones
 * @returns {Object} { diasTotales, diasLaborales, diasFinDeSemana }
 */
function calcularDiasVacaciones(fechaInicio, fechaFin) {
  const inicio = moment(fechaInicio).startOf('day');
  let fin = moment(fechaFin).startOf('day');

  if (inicio.isAfter(fin)) {
    return { diasTotales: 0, diasLaborales: 0, diasFinDeSemana: 0 };
  }

  // Si el último día es viernes, extender hasta el domingo
  // porque técnicamente regresarías el lunes
  if (fin.day() === 5) { // 5 = Viernes
    fin = fin.clone().add(2, 'days'); // Extender hasta el domingo
  }

  // Primero, identificar todos los viernes en el rango
  const viernesEnRango = [];
  const actual = inicio.clone();
  
  while (actual.isSameOrBefore(fin)) {
    if (actual.day() === 5) { // 5 = Viernes
      viernesEnRango.push(actual.clone());
    }
    actual.add(1, 'days');
  }

  // Crear un Set con los fines de semana que deben contar
  // (los que siguen a un viernes que está en el rango de vacaciones)
  const finesDeSemanaCuentan = new Set();
  
  viernesEnRango.forEach(viernes => {
    // El sábado y domingo después de este viernes cuentan
    const sabado = viernes.clone().add(1, 'days').format('YYYY-MM-DD');
    const domingo = viernes.clone().add(2, 'days').format('YYYY-MM-DD');
    finesDeSemanaCuentan.add(sabado);
    finesDeSemanaCuentan.add(domingo);
  });

  let diasContados = 0;
  let diasLaborales = 0;
  let diasFinDeSemana = 0;

  const recorrido = inicio.clone();
  while (recorrido.isSameOrBefore(fin)) {
    const diaSemana = recorrido.day(); // 0=Domingo, 6=Sábado
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const fechaStr = recorrido.format('YYYY-MM-DD');

    if (!esFinDeSemana) {
      // Día laboral (lunes a viernes) - siempre cuenta
      diasContados++;
      diasLaborales++;
    } else {
      // Es fin de semana - verificar si debe contar
      if (finesDeSemanaCuentan.has(fechaStr)) {
        diasContados++;
        diasFinDeSemana++;
      }
    }

    recorrido.add(1, 'days');
  }

  return {
    diasTotales: diasContados,
    diasLaborales,
    diasFinDeSemana
  };
}

module.exports = { calcularDiasVacaciones };
