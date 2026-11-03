/** Pueden registrar y cerrar/reabrir el cierre comercial de la propuesta (cualquier cotización). */
const COTIZACION_CIERRE_COMERCIAL_AUTORIZADOS = [
  'magali.sevillano@prayaga.biz',
  'enrique.agapito@prayaga.biz'
];

function esAutorizadoCierreComercial(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  return COTIZACION_CIERRE_COMERCIAL_AUTORIZADOS.includes(e);
}

function puedeGestionarCierreComercial(req, empleado) {
  if (req.usuario?.rol_nombre === 'admin') return true;
  return empleado && esAutorizadoCierreComercial(empleado.email);
}

module.exports = {
  COTIZACION_CIERRE_COMERCIAL_AUTORIZADOS,
  esAutorizadoCierreComercial,
  puedeGestionarCierreComercial
};
