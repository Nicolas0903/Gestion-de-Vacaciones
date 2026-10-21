/** Mapa id de módulo (portal) → nombre de archivo en public/manuales/ */
export const MANUAL_SLUG_BY_MODULO = {
  'portal-inicio': 'portal-general',
  vacaciones: 'vacaciones',
  permisos: 'permisos',
  boletas: 'boletas',
  asistencia: 'asistencia',
  reembolsos: 'reembolsos',
  'rendicion-presupuesto': 'rendicion-presupuesto',
  'caja-chica': 'caja-chica',
  'caja-rendicion': 'caja-rendicion',
  proveedores: 'proveedores',
  'archivo-respaldos': 'archivo-respaldos',
  'comisiones-por-pagar': 'comisiones-por-pagar',
  'consumo-fabric': 'consumo-fabric',
  'solicitud-cotizacion': 'solicitud-cotizacion',
  cotizaciones: 'cotizaciones',
  'cierre-negocio': 'cierre-negocio',
  'control-proyectos': 'control-proyectos-bolsa-horas',
  'solicitudes-registro': 'solicitudes-registro',
  'administracion-usuarios': 'administracion-usuarios'
};

export function slugManualModulo(moduloId) {
  return MANUAL_SLUG_BY_MODULO[moduloId] || null;
}

export function urlManualModulo(moduloId) {
  const slug = slugManualModulo(moduloId);
  if (!slug) return null;
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  return `${base}/manuales/${slug}.md`;
}
