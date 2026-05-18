/**
 * Tamaño máximo del comprobante en rendiciones de presupuesto (multer).
 * Sobrescribir en el server: RENDICION_PRESUPUESTO_MAX_UPLOAD_MB=25
 * Nota: nginx/apache también pueden limitar el body (p. ej. client_max_body_size).
 */
const parsed = parseInt(process.env.RENDICION_PRESUPUESTO_MAX_UPLOAD_MB || '10', 10);
const mb = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;

module.exports = {
  RENDICION_PRESUPUESTO_MAX_UPLOAD_MB: mb,
  RENDICION_PRESUPUESTO_MAX_FILE_BYTES: mb * 1024 * 1024
};
