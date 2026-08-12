const BolsaHorasAvisoPendiente = require('../models/BolsaHorasAvisoPendiente');
const emailService = require('./emailService');
const { ccReporteBolsaHorasEncargado } = require('../config/bolsaHorasEmails');

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

      const ok = await emailService.enviarReporteBolsaHorasEncargado({
        encargadoEmail: email,
        encargadoNombre: enc.encargado_nombre,
        cambios: filas,
        rangoDesde: rango.desde,
        rangoHasta: rango.hasta,
        periodo: 'semanal',
        cc: ccReporteBolsaHorasEncargado(email, filas)
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

function limitesMesCalendario(ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const finExclusivo = new Date(y, m + 1, 1);
  const pad = (n) => String(n).padStart(2, '0');
  const inicioSql = `${y}-${pad(m + 1)}-01 00:00:00`;
  const finExclusivoSql = `${finExclusivo.getFullYear()}-${pad(finExclusivo.getMonth() + 1)}-01 00:00:00`;
  const ultimoDia = new Date(finExclusivo.getTime() - 86400000);
  const fmt = (d) =>
    d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return {
    inicioSql,
    finExclusivoSql,
    desde: fmt(new Date(y, m, 1)),
    hasta: fmt(ultimoDia)
  };
}

function esUltimoDiaDelMes(ref = new Date()) {
  const manana = new Date(ref);
  manana.setDate(ref.getDate() + 1);
  return manana.getMonth() !== ref.getMonth();
}

async function ejecutarReporteMensualBolsaHoras(ref = new Date()) {
  try {
    const { inicioSql, finExclusivoSql, desde, hasta } = limitesMesCalendario(ref);
    const encargados = await BolsaHorasAvisoPendiente.listarEncargadosConCambiosEnMes(
      inicioSql,
      finExclusivoSql
    );
    if (!encargados.length) {
      console.log('📋 Bolsa horas: reporte mensual — sin cambios en el mes.');
      return { enviados: 0, omitidos: 0 };
    }

    let enviados = 0;
    let omitidos = 0;

    for (const enc of encargados) {
      const email = enc.encargado_email;
      const filas = await BolsaHorasAvisoPendiente.listarCambiosMesPorEncargado(
        email,
        inicioSql,
        finExclusivoSql
      );
      if (!filas.length) continue;

      const ok = await emailService.enviarReporteBolsaHorasEncargado({
        encargadoEmail: email,
        encargadoNombre: enc.encargado_nombre,
        cambios: filas,
        rangoDesde: desde,
        rangoHasta: hasta,
        periodo: 'mensual',
        cc: ccReporteBolsaHorasEncargado(email, filas)
      });

      if (ok) {
        enviados += 1;
        console.log(`📋 Bolsa horas: reporte mensual enviado → ${email} (${filas.length} cambio(s))`);
      } else {
        omitidos += 1;
        console.warn(`📋 Bolsa horas: no se pudo enviar reporte mensual → ${email}`);
      }
    }

    return { enviados, omitidos };
  } catch (e) {
    const msg = e.sqlMessage || e.message || String(e);
    if (msg.includes("doesn't exist") || msg.includes('Unknown column') || e.errno === 1146) {
      console.warn('📋 Bolsa horas reporte mensual: revise tablas/SQL de avisos.');
      return { enviados: 0, omitidos: 0, error: msg };
    }
    throw e;
  }
}

module.exports = {
  ejecutarReporteSemanalBolsaHoras,
  ejecutarReporteMensualBolsaHoras,
  rangoSemanaReporte,
  limitesMesCalendario,
  esUltimoDiaDelMes
};
