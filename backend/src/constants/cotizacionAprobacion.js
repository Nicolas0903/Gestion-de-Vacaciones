/** Envío a revisión / aprobación de la propuesta económica */
const COTIZACION_APROBACION_PARA = 'magali.sevillano@prayaga.biz';
const COTIZACION_APROBACION_COPIA = ['enrique.agapito@prayaga.biz'];

function puedeAprobarCotizacion(req, empleado) {
  if (req.usuario?.rol_nombre === 'admin') return true;
  const e = String(empleado?.email || '')
    .trim()
    .toLowerCase();
  const todos = [COTIZACION_APROBACION_PARA, ...COTIZACION_APROBACION_COPIA].map((x) =>
    String(x).trim().toLowerCase()
  );
  return todos.includes(e);
}

module.exports = {
  COTIZACION_APROBACION_PARA,
  COTIZACION_APROBACION_COPIA,
  puedeAprobarCotizacion
};
