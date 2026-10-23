/**
 * Correo que recibe la notificación de aprobación de solicitud de presupuesto
 * (independiente de rendiciones; no incluye asistente ni copias informativas).
 */
const APROBADOR_EMAIL_DEFAULT = 'magali.sevillano@prayaga.biz';

function emailAprobadorSolicitudPresupuesto() {
  const raw = process.env.SOLICITUD_PRESUPUESTO_APROBADOR_EMAIL || APROBADOR_EMAIL_DEFAULT;
  return String(raw).trim().toLowerCase();
}

module.exports = {
  APROBADOR_EMAIL_DEFAULT,
  emailAprobadorSolicitudPresupuesto
};
