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
 * Acceso efectivo (rol + correo + modulos_portal).
 */
function tieneAccesoEfectivoModulo(empleado, moduloId) {
  if (!rolPuedeModuloBase(empleado.rol_nombre, moduloId, empleado.email)) return false;
  const m = empleado.modulos_portal;
  if (m == null || typeof m !== 'object') return true;
  return m[moduloId] !== false;
}

/** Todos los módulos del catálogo con flag activo (para tabla y resúmenes). */
function accesoPortalDetalleCompleto(empleado) {
  return MODULOS_PORTAL.map((mod) => ({
    id: mod.id,
    etiqueta: mod.etiqueta,
    activo: tieneAccesoEfectivoModulo(empleado, mod.id)
  }));
}

/**
 * Etiquetas solo de módulos con acceso efectivo (retrocompat).
 */
function etiquetasAccesoResumen(empleado) {
  return accesoPortalDetalleCompleto(empleado)
    .filter((x) => x.activo)
    .map((x) => x.etiqueta);
}

module.exports = {
  rolPuedeModuloBase,
  tieneAccesoEfectivoModulo,
  accesoPortalDetalleCompleto,
  etiquetasAccesoResumen,
  EMAILS_REPORTE_ASISTENCIA
};
