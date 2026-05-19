-- Datos de depósito / transferencia que complementa cada rendición aprobada
-- (registrados desde el módulo «Caja rendición de presupuesto»).
-- Ejecutar sobre gestor_vacaciones (o la BD donde está rendiciones_presupuesto).

ALTER TABLE rendiciones_presupuesto
  ADD COLUMN fecha_deposito DATE NULL COMMENT 'Fecha del depósito o transferencia al colaborador' AFTER monto,
  ADD COLUMN monto_deposito DECIMAL(12, 2) NULL COMMENT 'Monto efectivamente depositado' AFTER fecha_deposito,
  ADD COLUMN comprobante_deposito_nombre VARCHAR(255) NULL AFTER monto_deposito,
  ADD COLUMN comprobante_deposito_path VARCHAR(500) NULL AFTER comprobante_deposito_nombre;
