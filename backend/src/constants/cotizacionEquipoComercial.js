/** Equipo comercial: ve todas las cotizaciones, adjuntos; propuesta sin montos (cierre solo Magali/Enrique/admin). */
const COTIZACION_EQUIPO_COMERCIAL_EMAILS = [
  'luis.hurtado@prayaga.biz',
  'alessandro.morales@prayaga.biz',
  'rc.comercial@prayaga.biz'
];

function esEmailEquipoComercial(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  return COTIZACION_EQUIPO_COMERCIAL_EMAILS.includes(e);
}

module.exports = { COTIZACION_EQUIPO_COMERCIAL_EMAILS, esEmailEquipoComercial };
