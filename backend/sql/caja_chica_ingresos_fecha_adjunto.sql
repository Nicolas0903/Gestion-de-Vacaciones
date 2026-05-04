-- Fecha de depósito y comprobante adjunto por línea de ingreso (caja chica)
ALTER TABLE caja_chica_ingresos
  ADD COLUMN fecha_deposito DATE NULL COMMENT 'Fecha del depósito/transferencia cuando aplica' AFTER monto,
  ADD COLUMN comprobante_archivo VARCHAR(255) NULL COMMENT 'Nombre archivo en uploads/caja-chica-ingresos/' AFTER fecha_deposito;
