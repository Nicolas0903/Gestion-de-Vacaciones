-- Tabla para tokens de aprobación por correo
CREATE TABLE IF NOT EXISTS tokens_aprobacion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(64) NOT NULL UNIQUE,
  solicitud_id INT NOT NULL,
  aprobador_id INT NOT NULL,
  accion ENUM('aprobar', 'rechazar') NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  usado_en TIMESTAMP NULL,
  expira_en TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (solicitud_id) REFERENCES solicitudes_vacaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobador_id) REFERENCES empleados(id),
  INDEX idx_token (token),
  INDEX idx_solicitud (solicitud_id)
);
