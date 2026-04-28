-- RUC y N° documento del comprobante (mismo valor en ambos campos para caja chica)
ALTER TABLE solicitudes_reembolso
  ADD COLUMN ruc_proveedor VARCHAR(32) NULL COMMENT 'RUC o identificador (mismo valor que numero_documento si aplica)' AFTER monto,
  ADD COLUMN numero_documento VARCHAR(80) NULL COMMENT 'N° documento (mismo valor que ruc_proveedor si aplica)' AFTER ruc_proveedor;
