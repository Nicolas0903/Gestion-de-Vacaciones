CREATE TABLE IF NOT EXISTS cotizacion_adjuntos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id INT NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL COMMENT 'Nombre en disco',
  tamano_bytes INT NOT NULL DEFAULT 0,
  mime_type VARCHAR(120) NULL,
  comentario VARCHAR(500) NULL,
  subido_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cotizacion_adjuntos_cot (cotizacion_id),
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (subido_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
