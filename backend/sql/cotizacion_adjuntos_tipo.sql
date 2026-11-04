ALTER TABLE cotizacion_adjuntos
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(32) NOT NULL DEFAULT 'general'
  COMMENT 'general | evidencia_criterio';
