/**
 * Correos del módulo Rendición de Presupuesto únicamente.
 * NO aplica a reembolsos, vacaciones ni otros procesos del portal.
 *
 * Variables opcionales en .env (solo este módulo):
 *   RENDICION_PRESUPUESTO_NOTIFICACION_EMAILS=asistente@...,rocio.picon@...,magali.sevillano@...
 *   RENDICION_PRESUPUESTO_APROBADORES_EMAILS=asistente@...,magali.sevillano@...
 *
 * Quien puede aprobar: Magali o Verónica (basta con una aprobación).
 * Rocío recibe aviso informativo sin botones de aprobar/rechazar.
 */
const NOTIFICACION_REGISTRO_EMAILS_DEFAULT = [
  'asistente@prayaga.biz',
  'rocio.picon@prayaga.biz',
  'magali.sevillano@prayaga.biz'
];

const APROBACION_EMAILS_DEFAULT = [
  'asistente@prayaga.biz',
  'magali.sevillano@prayaga.biz'
];

function parseCsvEnv(raw) {
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return null;
}

function notificacionRegistroEmailsConfigurados() {
  return (
    parseCsvEnv(process.env.RENDICION_PRESUPUESTO_NOTIFICACION_EMAILS) ||
    NOTIFICACION_REGISTRO_EMAILS_DEFAULT.map((e) => e.toLowerCase())
  );
}

function aprobacionEmailsConfigurados() {
  return (
    parseCsvEnv(process.env.RENDICION_PRESUPUESTO_APROBADORES_EMAILS) ||
    APROBACION_EMAILS_DEFAULT.map((e) => e.toLowerCase())
  );
}

module.exports = {
  NOTIFICACION_REGISTRO_EMAILS_DEFAULT,
  APROBACION_EMAILS_DEFAULT,
  notificacionRegistroEmailsConfigurados,
  aprobacionEmailsConfigurados
};
