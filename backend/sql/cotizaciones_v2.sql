-- Evolución módulo cotizaciones: catálogo tipos proyecto
-- (columnas tipo_proyecto / notas en cotizaciones: script run-cotizaciones-v2-migration.js)

CREATE TABLE IF NOT EXISTS cotizacion_tipos_proyecto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_sap VARCHAR(16) NULL,
  nombre VARCHAR(120) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cot_tipo_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cotizacion_tipos_proyecto (codigo_sap, nombre) VALUES
  ('7001', 'LICENCIAS - VENTA'),
  ('7001A', 'ACTIVACION DE LICENCIAS'),
  ('7001B', 'LICENCIAS POWER BI'),
  ('7001C', 'LICENCIAS SNOWFLAKE'),
  ('7002', 'CONSULTORIA'),
  ('7003', 'CAPACITACION'),
  ('7004', 'SOPORTE Y MANTENIMIENTO'),
  ('7008', 'OTROS');
