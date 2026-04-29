const { MODULOS_PORTAL } = require('../constants/portalModulos');

const EMAILS_REPORTE_ASISTENCIA = [
  'rocio.picon@prayaga.biz',
  'enrique.prayaga@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
];

/**
 * Si el rol (y correo cuando aplica) permitiría ver el módulo antes de aplicar modulos_portal.
 */
function rolPuedeModuloBase(rolNombre, moduloId, email) {
  const e = (email || '').toLowerCase().trim();
  const base = ['vacaciones', 'boletas', 'permisos', 'reembolsos'];
  if (base.includes(moduloId)) return true;
  if (moduloId === 'asistencia') {
    return rolNombre === 'admin' || EMAILS_REPORTE_ASISTENCIA.includes(e);
  }
  if (moduloId === 'caja-chica' || moduloId === 'solicitudes-registro') {
    return rolNombre === 'admin' || rolNombre === 'contadora';
  }
  return false;
}

/**
 * Etiquetas para columna "Acceso" en listado (respeta modulos_portal cuando existe).
 */
function etiquetasAccesoResumen(empleado) {
  const m = empleado.modulos_portal;
  return MODULOS_PORTAL.filter((mod) => {
    if (!rolPuedeModuloBase(empleado.rol_nombre, mod.id, empleado.email)) return false;
    if (m == null || typeof m !== 'object') return true;
    return m[mod.id] !== false;
  }).map((mod) => mod.etiqueta);
}

module.exports = {
  rolPuedeModuloBase,
  etiquetasAccesoResumen,
  EMAILS_REPORTE_ASISTENCIA
};
