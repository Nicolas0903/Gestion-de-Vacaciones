const cron = require('node-cron');
const {
  ejecutarReporteSemanalBolsaHoras,
  ejecutarReporteMensualBolsaHoras,
  esUltimoDiaDelMes
} = require('./bolsaHorasReporteService');

const TIMEZONE = process.env.BOLSA_HORAS_REPORTE_TIMEZONE || process.env.BACKUP_TIMEZONE || 'America/Lima';
const CRON_EXPR = process.env.BOLSA_HORAS_REPORTE_CRON || '0 9 * * 5';
const CRON_MENSUAL_EXPR = process.env.BOLSA_HORAS_REPORTE_MENSUAL_CRON || '0 9 28-31 * *';

function iniciarBolsaHorasReporteScheduler() {
  if (process.env.BOLSA_HORAS_REPORTE_ENABLED === 'false') {
    console.log('📋 Reporte semanal bolsa de horas deshabilitado (BOLSA_HORAS_REPORTE_ENABLED=false)');
    return;
  }

  if (!cron.validate(CRON_EXPR)) {
    console.warn(`📋 Reporte bolsa horas: expresión cron inválida (${CRON_EXPR}), scheduler no iniciado.`);
    return;
  }

  const jobSemanal = cron.schedule(
    CRON_EXPR,
    () => {
      ejecutarReporteSemanalBolsaHoras().catch((err) => {
        console.error('Error en reporte semanal bolsa de horas:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  jobSemanal.start();
  console.log(`📋 Reporte semanal bolsa de horas: ${CRON_EXPR} (${TIMEZONE})`);

  if (process.env.BOLSA_HORAS_REPORTE_MENSUAL_ENABLED === 'false') {
    console.log('📋 Reporte mensual bolsa de horas deshabilitado (BOLSA_HORAS_REPORTE_MENSUAL_ENABLED=false)');
    return;
  }

  if (!cron.validate(CRON_MENSUAL_EXPR)) {
    console.warn(`📋 Reporte mensual bolsa horas: cron inválido (${CRON_MENSUAL_EXPR}).`);
    return;
  }

  const jobMensual = cron.schedule(
    CRON_MENSUAL_EXPR,
    () => {
      const ahora = new Date();
      if (!esUltimoDiaDelMes(ahora)) return;
      ejecutarReporteMensualBolsaHoras(ahora).catch((err) => {
        console.error('Error en reporte mensual bolsa de horas:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  jobMensual.start();
  console.log(`📋 Reporte mensual bolsa de horas: ${CRON_MENSUAL_EXPR} (${TIMEZONE}, último día del mes)`);
}

module.exports = {
  iniciarBolsaHorasReporteScheduler,
  ejecutarReporteSemanalBolsaHoras,
  ejecutarReporteMensualBolsaHoras
};
