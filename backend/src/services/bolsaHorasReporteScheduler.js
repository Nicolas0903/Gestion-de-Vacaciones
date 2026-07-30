const cron = require('node-cron');
const { ejecutarReporteSemanalBolsaHoras } = require('./bolsaHorasReporteService');

const TIMEZONE = process.env.BOLSA_HORAS_REPORTE_TIMEZONE || process.env.BACKUP_TIMEZONE || 'America/Lima';
const CRON_EXPR = process.env.BOLSA_HORAS_REPORTE_CRON || '0 9 * * 5';

function iniciarBolsaHorasReporteScheduler() {
  if (process.env.BOLSA_HORAS_REPORTE_ENABLED === 'false') {
    console.log('📋 Reporte semanal bolsa de horas deshabilitado (BOLSA_HORAS_REPORTE_ENABLED=false)');
    return;
  }

  if (!cron.validate(CRON_EXPR)) {
    console.warn(`📋 Reporte bolsa horas: expresión cron inválida (${CRON_EXPR}), scheduler no iniciado.`);
    return;
  }

  const job = cron.schedule(
    CRON_EXPR,
    () => {
      ejecutarReporteSemanalBolsaHoras().catch((err) => {
        console.error('Error en reporte semanal bolsa de horas:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  job.start();
  console.log(`📋 Reporte semanal bolsa de horas: ${CRON_EXPR} (${TIMEZONE})`);
}

module.exports = { iniciarBolsaHorasReporteScheduler, ejecutarReporteSemanalBolsaHoras };
