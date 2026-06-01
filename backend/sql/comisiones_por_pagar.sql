-- Módulo Comisiones por Pagar
-- Encabezado (admin): vendedor, cliente, valor servicio, % comisión, condiciones.
-- Filas: cuotas / facturas con importe, comisión calculada, fechas, firma, observaciones.

CREATE TABLE IF NOT EXISTS comisiones_por_pagar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendedor VARCHAR(200) NOT NULL,
  cliente VARCHAR(200) NOT NULL,
  valor_servicio DECIMAL(14, 2) NOT NULL DEFAULT 0,
  moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN' COMMENT 'PEN=soles, USD=dólares',
  porcentaje_comision DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Ej. 10 = 10%',
  condiciones_pago TEXT NULL,
  estado ENUM('borrador', 'activo', 'cerrado') NOT NULL DEFAULT 'activo',
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comisiones_cliente (cliente),
  INDEX idx_comisiones_vendedor (vendedor),
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comisiones_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comision_id INT NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  forma VARCHAR(80) NOT NULL COMMENT 'Ej. 1er Pago, 2do Pago',
  importe DECIMAL(14, 2) NOT NULL DEFAULT 0,
  no_factura VARCHAR(80) NULL,
  fecha_emision_factura DATE NULL,
  comision_monto DECIMAL(14, 2) NOT NULL DEFAULT 0,
  fecha_pago DATE NULL,
  firma VARCHAR(200) NULL,
  observaciones TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comisiones_pagos_comision (comision_id),
  FOREIGN KEY (comision_id) REFERENCES comisiones_por_pagar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
