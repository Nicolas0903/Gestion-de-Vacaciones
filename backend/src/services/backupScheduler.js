const cron = require('node-cron');
const { ejecutarRespaldo } = require('./backupArchivoService');

const TIMEZONE = process.env.BACKUP_TIMEZONE || 'America/Lima';

function iniciarBackupScheduler() {
  if (process.env.BACKUP_ENABLED === 'false') {
    console.log('📦 Respaldos automáticos deshabilitados (BACKUP_ENABLED=false)');
    return;
  }

  const manana = cron.schedule(
    '30 8 * * *',
    () => {
      ejecutarRespaldo('manana').catch((err) => {
        console.error('Error en respaldo matutino:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  const tarde = cron.schedule(
    '30 17 * * *',
    () => {
      ejecutarRespaldo('tarde').catch((err) => {
        console.error('Error en respaldo vespertino:', err);
      });
    },
    { timezone: TIMEZONE }
  );

  manana.start();
  tarde.start();

  console.log(`📦 Respaldos automáticos: 08:30 y 17:30 (${TIMEZONE})`);
}

module.exports = { iniciarBackupScheduler };
