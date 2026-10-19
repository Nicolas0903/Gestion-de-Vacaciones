-- Evolución módulo cotizaciones: campos generales + catálogo tipos proyecto

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS tipo_proyecto VARCHAR(120) NULL AFTER proyecto,
  ADD COLUMN IF NOT EXISTS tipo_proyecto_codigo VARCHAR(16) NULL AFTER tipo_proyecto,
  ADD COLUMN IF NOT EXISTS notas_internas TEXT NULL AFTER tipo_proyecto_codigo;

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
