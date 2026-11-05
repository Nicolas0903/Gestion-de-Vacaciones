/** Responsable operativo del módulo Cierre de negocio (+ admin). */
const EMAILS_MODULO_CIERRE_NEGOCIO = ['veronica.gonzales@prayaga.biz'];

function esGestorCierreNegocioEmail(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  return EMAILS_MODULO_CIERRE_NEGOCIO.includes(e);
}

module.exports = { EMAILS_MODULO_CIERRE_NEGOCIO, esGestorCierreNegocioEmail };
