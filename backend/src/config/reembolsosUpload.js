/**
 * Tamaño máximo del comprobante en reembolsos (multer).
 * Sobrescribir en el server: REEMBOLSOS_MAX_UPLOAD_MB=25
 * Nota: nginx/apache también pueden limitar el body (p. ej. client_max_body_size).
 */
const parsed = parseInt(process.env.REEMBOLSOS_MAX_UPLOAD_MB || '10', 10);
const mb = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;

module.exports = {
  REEMBOLSOS_MAX_UPLOAD_MB: mb,
  REEMBOLSOS_MAX_FILE_BYTES: mb * 1024 * 1024
};
