-- RUC del emisor y N° de factura del comprobante (valores independientes)
ALTER TABLE solicitudes_reembolso
  ADD COLUMN ruc_proveedor VARCHAR(32) NULL COMMENT 'RUC del emisor según comprobante' AFTER monto,
  ADD COLUMN numero_documento VARCHAR(80) NULL COMMENT 'N° de factura / documento' AFTER ruc_proveedor;
