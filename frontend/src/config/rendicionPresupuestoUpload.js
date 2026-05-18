/**
 * Tamaño máximo del comprobante adjunto en rendiciones (validación UX).
 * El backend tiene su propio límite con multer; mantenelos sincronizados.
 * Sobrescribir vía: REACT_APP_RENDICION_PRESUPUESTO_MAX_UPLOAD_MB
 */
const parsed = parseInt(
  process.env.REACT_APP_RENDICION_PRESUPUESTO_MAX_UPLOAD_MB || '10',
  10
);
const mb = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 10;

export const RENDICION_PRESUPUESTO_MAX_UPLOAD_MB = mb;
export const RENDICION_PRESUPUESTO_MAX_FILE_BYTES = mb * 1024 * 1024;
