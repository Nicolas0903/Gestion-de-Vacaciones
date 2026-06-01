const { MODULOS_PORTAL } = require('../constants/portalModulos');

const EMAILS_REPORTE_ASISTENCIA = [
  'rocio.picon@prayaga.biz',
  'enrique.prayaga@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
];

/** Acceso a Caja chica aunque no sea admin/contadora (mapa portal o rol). */
const EMAILS_MODULO_CAJA_CHICA = [
  'rocio.picon@prayaga.biz',
  'asistente@prayaga.biz',
  'veronica.gonzales@prayaga.biz',
  'enrique.prayaga@prayaga.biz',
  'enrique.agapito@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
];

/**
 * Si el rol (y correo cuando aplica) permitiría ver el módulo antes de aplicar modulos_portal.
 */
function rolPuedeModuloBase(rolNombre, moduloId, email) {
  const e = (email || '').toLowerCase().trim();
  const base = ['vacaciones', 'boletas', 'permisos', 'reembolsos', 'control-proyectos'];
  if (base.includes(moduloId)) return true;
  if (moduloId === 'asistencia') {
    return rolNombre === 'admin' || EMAILS_REPORTE_ASISTENCIA.includes(e);
  }
  if (moduloId === 'caja-chica' || moduloId === 'caja-rendicion') {
    if (EMAILS_MODULO_CAJA_CHICA.includes(e)) return true;
    return rolNombre === 'admin' || rolNombre === 'contadora';
  }
  if (moduloId === 'solicitudes-registro' || moduloId === 'archivo-respaldos') {
    return rolNombre === 'admin' || rolNombre === 'contadora';
  }
  // Proveedores: solo admin por defecto; el resto según modulos_portal en Administración de usuarios.
  if (moduloId === 'proveedores') {
    return rolNombre === 'admin';
  }
  if (moduloId === 'comisiones-por-pagar') {
    return rolNombre === 'admin';
  }
  // Rendición de presupuesto: acceso restringido. Solo admin tiene acceso por defecto;
  // para el resto del personal, debe activarse explícitamente vía modulos_portal.
  if (moduloId === 'rendicion-presupuesto') {
    return rolNombre === 'admin';
  }
  return false;
}

function tieneMapaPortalExplicito(empleado) {
  const m = empleado.modulos_portal;
  return m != null && typeof m === 'object' && Object.keys(m).length > 0;
}

/**
 * Acceso al módulo: si hay mapa JSON guardado, solo entran los que están en true.
 * Si no hay mapa (null / vacío), se usa la lógica histórica por rol y correo.
 */
function tieneAccesoEfectivoModulo(empleado, moduloId) {
  const e = (empleado.email || '').toLowerCase().trim();
  if (
    (moduloId === 'caja-chica' || moduloId === 'caja-rendicion') &&
    EMAILS_MODULO_CAJA_CHICA.includes(e)
  ) {
    return true;
  }
  // Admin siempre puede acceder a Rendición de Presupuesto (es quien aprueba).
  if (moduloId === 'rendicion-presupuesto' && empleado.rol_nombre === 'admin') {
    return true;
  }
  // Admin siempre puede acceder a Proveedores (gestión del catálogo).
  if (moduloId === 'proveedores' && empleado.rol_nombre === 'admin') {
    return true;
  }
  if (moduloId === 'comisiones-por-pagar' && empleado.rol_nombre === 'admin') {
    return true;
  }
  if (tieneMapaPortalExplicito(empleado)) {
    return empleado.modulos_portal[moduloId] === true;
  }
  if (!rolPuedeModuloBase(empleado.rol_nombre, moduloId, empleado.email)) return false;
  return true;
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
  tieneMapaPortalExplicito,
  tieneAccesoEfectivoModulo,
  accesoPortalDetalleCompleto,
  etiquetasAccesoResumen,
  EMAILS_REPORTE_ASISTENCIA,
  EMAILS_MODULO_CAJA_CHICA
};
