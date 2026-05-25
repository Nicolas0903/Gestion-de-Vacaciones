-- Registro de respaldos automáticos (Excel legible + volcado SQL opcional)
CREATE TABLE IF NOT EXISTS backup_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  turno ENUM('manana', 'tarde') NOT NULL,
  fecha DATE NOT NULL,
  excel_path VARCHAR(512) NOT NULL,
  sql_path VARCHAR(512) NULL,
  excel_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sql_bytes BIGINT UNSIGNED NULL,
  email_enviado TINYINT(1) NOT NULL DEFAULT 0,
  email_adjunto_sql TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('ok', 'parcial', 'error') NOT NULL DEFAULT 'ok',
  mensaje_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_backup_fecha (fecha DESC),
  INDEX idx_backup_turno_fecha (turno, fecha DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
