const cron = require('node-cron');
const { ejecutarResumenPendientesSemanal } = require('./pendientesSemanalService');

const TIMEZONE =
  process.env.PENDIENTES_SEMANAL_TIMEZONE ||
  process.env.BOLSA_HORAS_REPORTE_TIMEZONE ||
  process.env.BACKUP_TIMEZONE ||
  'America/Lima';
const CRON_EXPR = process.env.PENDIENTES_SEMANAL_CRON || '0 8 * * 1';

function iniciarPendientesSemanalScheduler() {
  if (process.env.PENDIENTES_SEMANAL_ENABLED === 'false') {
    console.log('📬 Resumen semanal de pendientes deshabilitado (PENDIENTES_SEMANAL_ENABLED=false)');
    return;
  }

  if (!cron.validate(CRON_EXPR)) {
    console.warn(`📬 Resumen pendientes: expresión cron inválida (${CRON_EXPR}), scheduler no iniciado.`);
    return;
  }

  const job = cron.schedule(
    CRON_EXPR,
    () => {
      ejecutarResumenPendientesSemanal().catch((err) => {
        console.error('Error en resumen semanal de pendientes:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  job.start();
  console.log(`📬 Resumen semanal de pendientes: ${CRON_EXPR} (${TIMEZONE})`);
}

module.exports = {
  iniciarPendientesSemanalScheduler,
  ejecutarResumenPendientesSemanal
};
