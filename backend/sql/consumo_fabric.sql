-- Módulo Consumo Fabric: cargas PAYG y montos mensuales por cliente

CREATE TABLE IF NOT EXISTS fabric_consumo_montos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  mes TINYINT NOT NULL COMMENT '1-12',
  anio SMALLINT NOT NULL,
  monto DECIMAL(14, 2) NOT NULL DEFAULT 0,
  moneda VARCHAR(10) NOT NULL DEFAULT 'US$',
  notas TEXT NULL,
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_fabric_monto_cliente_periodo (customer_name, mes, anio),
  INDEX idx_fabric_monto_periodo (anio, mes),
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fabric_consumo_cargas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_domain VARCHAR(200) NULL,
  customer_country VARCHAR(10) NULL,
  codigo_ingram VARCHAR(40) NULL,
  reseller VARCHAR(200) NULL,
  periodo_inicio DATE NULL,
  periodo_fin DATE NULL,
  mes TINYINT NOT NULL,
  anio SMALLINT NOT NULL,
  archivo_nombre VARCHAR(255) NULL,
  archivo_path VARCHAR(500) NULL,
  total_filas INT NOT NULL DEFAULT 0,
  reporte_json JSON NOT NULL,
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fabric_carga_cliente (customer_name),
  INDEX idx_fabric_carga_periodo (anio, mes),
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
