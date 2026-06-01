-- Moneda en comisiones por pagar (soles o dólares)
ALTER TABLE comisiones_por_pagar
  ADD COLUMN moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN'
    COMMENT 'PEN=soles, USD=dólares'
  AFTER valor_servicio;
