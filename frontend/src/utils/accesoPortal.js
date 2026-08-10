/** Parsea modulos_portal aunque venga como string (sesiones antiguas). */
export function parseModulosPortal(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const EMAILS_MODULO_CAJA_CHICA = [
  'rocio.picon@prayaga.biz',
  'asistente@prayaga.biz',
  'veronica.gonzales@prayaga.biz',
  'enrique.prayaga@prayaga.biz',
  'enrique.agapito@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
];

export const EMAILS_MODULO_CONSUMO_FABRIC = ['veronica.gonzales@prayaga.biz'];

const EMAILS_REPORTE_ASISTENCIA = [
  'rocio.picon@prayaga.biz',
  'enrique.prayaga@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
];

/** Opciones de acceso derivadas del usuario (evita deps inestables en efectos). */
export function buildAccesoPortalOpts(usuario) {
  const rol = usuario?.rol_nombre;
  const em = (usuario?.email || '').toLowerCase().trim();
  return {
    esAdmin: () => rol === 'admin',
    esContadora: () => rol === 'contadora' || rol === 'admin',
    puedeVerReporteAsistencia: () =>
      rol === 'admin' || EMAILS_REPORTE_ASISTENCIA.includes(em),
    emailsCajaChica: EMAILS_MODULO_CAJA_CHICA,
    emailsConsumoFabric: EMAILS_MODULO_CONSUMO_FABRIC
  };
}

/** @returns {true|false|null} null si la clave no está en el mapa. */
export function leerFlagModuloPortal(modulos, moduloId) {
  if (!modulos || typeof modulos !== 'object') return null;
  if (!Object.prototype.hasOwnProperty.call(modulos, moduloId)) return null;
  const v = modulos[moduloId];
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return v ? true : false;
}

/**
 * Misma lógica de acceso que AuthContext / backend portalAcceso.
 * @param {object|null} usuario
 * @param {string} moduloId
 * @param {object} opts helpers (esAdmin, emails, etc.)
 */
export function evaluarAccesoModuloPortal(usuario, moduloId, opts) {
  if (!usuario) return false;

  const em = (usuario.email || '').toLowerCase().trim();
  const {
    esAdmin,
    esContadora,
    puedeVerReporteAsistencia,
    emailsCajaChica,
    emailsConsumoFabric = EMAILS_MODULO_CONSUMO_FABRIC
  } = opts;

  if (
    (moduloId === 'caja-chica' || moduloId === 'caja-rendicion') &&
    emailsCajaChica.includes(em)
  ) {
    return true;
  }

  if (moduloId === 'consumo-fabric' && emailsConsumoFabric.includes(em)) {
    return true;
  }

  if (moduloId === 'rendicion-presupuesto' && esAdmin()) return true;
  if (moduloId === 'proveedores' && esAdmin()) return true;
  if (moduloId === 'comisiones-por-pagar' && esAdmin()) return true;
  if (moduloId === 'consumo-fabric' && esAdmin()) return true;

  const m = parseModulosPortal(usuario.modulos_portal);
  const tieneMapa = m && Object.keys(m).length > 0;
  if (tieneMapa) {
    const flag = leerFlagModuloPortal(m, moduloId);
    if (flag === true) return true;
    if (flag === false) return false;
  }

  const baseColaborador = ['vacaciones', 'boletas', 'permisos', 'reembolsos', 'control-proyectos'];
  if (baseColaborador.includes(moduloId)) return true;

  if (moduloId === 'asistencia') return puedeVerReporteAsistencia();

  if (moduloId === 'caja-chica' || moduloId === 'caja-rendicion') {
    return esAdmin() || esContadora();
  }

  if (moduloId === 'solicitudes-registro' || moduloId === 'archivo-respaldos') {
    return esAdmin() || esContadora();
  }

  if (
    moduloId === 'proveedores' ||
    moduloId === 'rendicion-presupuesto' ||
    moduloId === 'comisiones-por-pagar' ||
    moduloId === 'consumo-fabric'
  ) {
    return false;
  }

  return true;
}
