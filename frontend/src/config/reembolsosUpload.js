/** Límite por comprobante; en producción suele coincidir con REEMBOLSOS_MAX_UPLOAD_MB del backend. */
const n = Number(process.env.REACT_APP_REEMBOLSOS_MAX_UPLOAD_MB);
export const REEMBOLSOS_MAX_UPLOAD_MB = Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 10;
export const REEMBOLSOS_MAX_FILE_BYTES = REEMBOLSOS_MAX_UPLOAD_MB * 1024 * 1024;
