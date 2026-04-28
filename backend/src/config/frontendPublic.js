/**
 * URL base del SPA tal como la abre el usuario (sin / final).
 * - FRONTEND_APP_URL: preferido, ej. http://96.126.124.60/gestion-vacaciones
 * - Si no: FRONTEND_URL + /gestion-vacaciones cuando aún no incluye esa ruta
 *   (evita 404 en enlaces del correo cuando FRONTEND_URL solo tiene el host).
 */
function getPortalBaseUrl() {
  const explicit = process.env.FRONTEND_APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  let u = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const lower = u.toLowerCase();
  if (lower.endsWith('/gestion-vacaciones')) {
    return u;
  }
  const marker = '/gestion-vacaciones';
  const idx = lower.indexOf(marker);
  if (idx !== -1) {
    return u.slice(0, idx + marker.length);
  }
  return `${u}${marker}`;
}

module.exports = { getPortalBaseUrl };
