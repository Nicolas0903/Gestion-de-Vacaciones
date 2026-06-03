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
    emailsCajaChica
  } = opts;

  if (
    (moduloId === 'caja-chica' || moduloId === 'caja-rendicion') &&
    emailsCajaChica.includes(em)
  ) {
    return true;
  }

  if (moduloId === 'rendicion-presupuesto' && esAdmin()) return true;
  if (moduloId === 'proveedores' && esAdmin()) return true;
  if (moduloId === 'comisiones-por-pagar' && esAdmin()) return true;
  if (moduloId === 'consumo-fabric' && esAdmin()) return true;

  const m = parseModulosPortal(usuario.modulos_portal);
  const tieneMapa = m && Object.keys(m).length > 0;
  if (tieneMapa) {
    return m[moduloId] === true;
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
