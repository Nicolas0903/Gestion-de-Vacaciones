CREATE TABLE IF NOT EXISTS cotizacion_solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(32) NOT NULL,
  estado ENUM('borrador', 'enviada', 'en_elaboracion', 'atendida', 'cancelada') NOT NULL DEFAULT 'borrador',
  solicitante_id INT NOT NULL,
  nombre_proyecto VARCHAR(200) NOT NULL DEFAULT '',
  cliente VARCHAR(200) NOT NULL DEFAULT '',
  tipo_proyecto VARCHAR(120) NOT NULL DEFAULT '',
  tipo_proyecto_codigo VARCHAR(16) NULL,
  fecha_limite DATE NULL,
  contexto_comercial TEXT NULL,
  contacto_cliente VARCHAR(200) NULL,
  email_cliente VARCHAR(200) NULL,
  cotizacion_id INT NULL,
  payload_json JSON NULL COMMENT 'Campos adicionales / borrador de info general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sol_cot_codigo (codigo),
  INDEX idx_sol_cot_estado (estado),
  FOREIGN KEY (solicitante_id) REFERENCES empleados(id) ON DELETE RESTRICT,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS solicitud_id INT NULL AFTER responsable_id;
