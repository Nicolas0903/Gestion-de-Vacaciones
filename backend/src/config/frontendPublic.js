/**
 * URL base del SPA tal como la abre el usuario (sin / final).
 * - FRONTEND_APP_URL: preferido, ej. http://96.126.124.60
 * - Si no: FRONTEND_URL (origen sin path).
 * El SPA ahora se sirve en la raíz, sin prefijo /gestion-vacaciones.
 */
function getPortalBaseUrl() {
  const explicit = process.env.FRONTEND_APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

module.exports = { getPortalBaseUrl };
