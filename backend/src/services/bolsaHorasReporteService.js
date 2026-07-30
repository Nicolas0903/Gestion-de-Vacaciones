const BolsaHorasAvisoPendiente = require('../models/BolsaHorasAvisoPendiente');
const emailService = require('./emailService');

function rangoSemanaReporte() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 7);
  return {
    desde: desde.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hasta: hasta.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  };
}

async function ejecutarReporteSemanalBolsaHoras() {
  try {
    const encargados = await BolsaHorasAvisoPendiente.listarEncargadosConPendientes();
    if (!encargados.length) {
      console.log('📋 Bolsa horas: reporte semanal — sin cambios pendientes.');
      return { enviados: 0, omitidos: 0 };
    }

    const rango = rangoSemanaReporte();
    let enviados = 0;
    let omitidos = 0;

    for (const enc of encargados) {
      const email = enc.encargado_email;
      const filas = await BolsaHorasAvisoPendiente.listarPorEncargado(email);
      if (!filas.length) continue;

      const ok = await emailService.enviarReporteSemanalBolsaHorasEncargado({
        encargadoEmail: email,
        encargadoNombre: enc.encargado_nombre,
        cambios: filas,
        rangoDesde: rango.desde,
        rangoHasta: rango.hasta
      });

      if (ok) {
        await BolsaHorasAvisoPendiente.eliminarPorEncargado(email);
        enviados += 1;
        console.log(`📋 Bolsa horas: reporte semanal enviado → ${email} (${filas.length} cambio(s))`);
      } else {
        omitidos += 1;
        console.warn(`📋 Bolsa horas: no se pudo enviar reporte → ${email}`);
      }
    }

    return { enviados, omitidos };
  } catch (e) {
    const msg = e.sqlMessage || e.message || String(e);
    if (msg.includes("doesn't exist") || e.errno === 1146) {
      console.warn('📋 Bolsa horas: falta tabla cp_actividades_avisos_pendientes. Ejecute backend/sql/cp_actividades_avisos_pendientes.sql');
      return { enviados: 0, omitidos: 0, error: 'tabla_faltante' };
    }
    throw e;
  }
}

module.exports = { ejecutarReporteSemanalBolsaHoras, rangoSemanaReporte };
