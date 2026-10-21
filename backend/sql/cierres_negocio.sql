-- Módulo Cierre de Negocio (vinculado a cotizaciones)

CREATE TABLE IF NOT EXISTS cierres_negocio (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL,
  cotizacion_id INT NOT NULL,
  cotizacion_version_num INT NOT NULL DEFAULT 1,
  cotizacion_codigo VARCHAR(50) NULL,
  snapshot_cotizacion JSON NULL,
  cliente_nombre VARCHAR(255) NULL,
  ruc VARCHAR(20) NULL,
  orden_compra VARCHAR(100) NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  semanas_proyecto DECIMAL(8, 2) NULL,
  forma_pago VARCHAR(120) NULL,
  moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN',
  codigo_servicio VARCHAR(50) NULL,
  riesgo ENUM('bajo', 'medio', 'alto') NOT NULL DEFAULT 'medio',
  status_cierre VARCHAR(50) NULL DEFAULT 'inicial',
  dias_garantia INT NOT NULL DEFAULT 0,
  estado VARCHAR(30) NOT NULL DEFAULT 'activo',
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cierres_codigo (codigo),
  KEY idx_cierres_cotizacion (cotizacion_id),
  CONSTRAINT fk_cierres_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cierre_facturacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cierre_id INT NOT NULL,
  factura VARCHAR(80) NULL,
  descripcion TEXT NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  fecha_estimada_facturacion DATE NULL,
  fecha_real_facturacion DATE NULL,
  cantidad DECIMAL(12, 4) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(14, 2) NOT NULL DEFAULT 0,
  aplica_igv TINYINT(1) NOT NULL DEFAULT 1,
  total_venta DECIMAL(14, 2) NOT NULL DEFAULT 0,
  orden INT NOT NULL DEFAULT 0,
  KEY idx_cierre_fact_cierre (cierre_id),
  CONSTRAINT fk_cierre_fact_cierre FOREIGN KEY (cierre_id) REFERENCES cierres_negocio (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cierre_costos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cierre_id INT NOT NULL,
  fase ENUM('inicial', 'final') NOT NULL DEFAULT 'inicial',
  titulo VARCHAR(255) NULL,
  cantidad DECIMAL(12, 4) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_costo DECIMAL(14, 2) NOT NULL DEFAULT 0,
  utilidad DECIMAL(14, 2) NOT NULL DEFAULT 0,
  margen_pct DECIMAL(8, 2) NOT NULL DEFAULT 0,
  proveedor VARCHAR(255) NULL,
  observacion TEXT NULL,
  orden INT NOT NULL DEFAULT 0,
  KEY idx_cierre_costos_cierre (cierre_id),
  CONSTRAINT fk_cierre_costos_cierre FOREIGN KEY (cierre_id) REFERENCES cierres_negocio (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
