-- Cola de avisos de bolsa de horas (reporte semanal al encargado del proyecto)
-- Idempotente: se puede ejecutar más de una vez.

USE gestor_vacaciones;

CREATE TABLE IF NOT EXISTS cp_actividades_avisos_pendientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actividad_id INT NOT NULL,
  encargado_empleado_id INT NULL,
  encargado_email VARCHAR(255) NOT NULL,
  encargado_nombre VARCHAR(200) NULL,
  modo ENUM('creada', 'actualizada') NOT NULL DEFAULT 'creada',
  empresa VARCHAR(200) NULL,
  proyecto_nombre VARCHAR(500) NULL,
  descripcion_resumen TEXT NULL,
  horas_trabajadas DECIMAL(10, 2) NULL,
  consultor_nombre VARCHAR(200) NULL,
  consultor_empleado_id INT NULL,
  consultor_email VARCHAR(255) NULL,
  usuario_nombre VARCHAR(200) NULL,
  usuario_email VARCHAR(255) NULL,
  registrado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_modificacion_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_actividad_aviso (actividad_id),
  INDEX idx_encargado_email (encargado_email),
  INDEX idx_ultima_modificacion (ultima_modificacion_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'cp_actividades_avisos_pendientes OK' AS status;
