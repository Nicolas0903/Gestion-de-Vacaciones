-- Moneda del gasto en rendición de presupuesto (soles o dólares)
ALTER TABLE rendiciones_presupuesto
  ADD COLUMN moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN' COMMENT 'PEN=soles, USD=dólares'
  AFTER monto;
