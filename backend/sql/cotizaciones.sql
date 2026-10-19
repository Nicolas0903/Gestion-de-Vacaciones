-- Módulo Cotizaciones (datos nativos, versionado por snapshot JSON)

CREATE TABLE IF NOT EXISTS cotizaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  cliente VARCHAR(200) NOT NULL DEFAULT '',
  proyecto VARCHAR(200) NOT NULL DEFAULT '',
  opcion VARCHAR(120) NULL,
  moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN',
  estado ENUM('borrador', 'en_revision', 'enviada', 'ganada', 'perdida') NOT NULL DEFAULT 'borrador',
  version_actual INT NOT NULL DEFAULT 0 COMMENT '0 = solo borrador sin versión publicada',
  borrador_json JSON NOT NULL COMMENT 'Datos editables en curso',
  creado_por INT NULL,
  responsable_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cotizaciones_codigo (codigo),
  INDEX idx_cotizaciones_cliente (cliente),
  INDEX idx_cotizaciones_estado (estado),
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL,
  FOREIGN KEY (responsable_id) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cotizacion_versiones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id INT NOT NULL,
  version_num INT NOT NULL,
  comentario_cambio TEXT NULL,
  snapshot_json JSON NOT NULL,
  es_actual TINYINT(1) NOT NULL DEFAULT 1,
  monto_propuesta DECIMAL(14, 2) NULL COMMENT 'KPI denormalizado para listados',
  costo_total DECIMAL(14, 2) NULL,
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cotizacion_version (cotizacion_id, version_num),
  INDEX idx_cotizacion_versiones_actual (cotizacion_id, es_actual),
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
