-- Aprobación de horas para locadores (bolsa de horas). Idempotente donde aplica.

USE gestor_vacaciones;

-- Flag en empleados (marcar locadores en Admin o con UPDATE al final)
SET @col_req := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'empleados' AND COLUMN_NAME = 'requiere_aprobacion_horas'
);
SET @sql_req := IF(
  @col_req = 0,
  'ALTER TABLE empleados ADD COLUMN requiere_aprobacion_horas TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Locador: actividades nuevas requieren aprobación por Requerido por'' AFTER es_consultor_cp',
  'SELECT ''requiere_aprobacion_horas ya existe'' AS info'
);
PREPARE stmt FROM @sql_req;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ampliar requerido_por + columnas de aprobación en actividades
ALTER TABLE cp_actividades
  MODIFY COLUMN requerido_por ENUM(
    'ricardo_martinez',
    'rodrigo_loayza',
    'juan_pena',
    'magali_sevillano',
    'enrique_agapito',
    'luis_aguayo',
    'stephanie_agapito',
    'jeff_pena',
    'otros'
  ) NOT NULL;

SET @col_est := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cp_actividades' AND COLUMN_NAME = 'estado_aprobacion'
);
SET @sql_est := IF(
  @col_est = 0,
  'ALTER TABLE cp_actividades
     ADD COLUMN estado_aprobacion ENUM(''no_aplica'',''pendiente'',''aprobada'',''rechazada'') NOT NULL DEFAULT ''no_aplica'' AFTER situacion_pago,
     ADD COLUMN aprobado_por_empleado_id INT NULL AFTER estado_aprobacion,
     ADD COLUMN aprobado_at DATETIME NULL AFTER aprobado_por_empleado_id,
     ADD COLUMN rechazado_at DATETIME NULL AFTER aprobado_at,
     ADD COLUMN comentario_aprobacion VARCHAR(500) NULL AFTER rechazado_at,
     ADD CONSTRAINT fk_cp_act_aprobador FOREIGN KEY (aprobado_por_empleado_id) REFERENCES empleados(id) ON DELETE SET NULL',
  'SELECT ''estado_aprobacion ya existe'' AS info'
);
PREPARE stmt2 FROM @sql_est;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

CREATE TABLE IF NOT EXISTS cp_actividades_aprobacion_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(64) NOT NULL,
  actividad_id INT NOT NULL,
  aprobador_empleado_id INT NOT NULL,
  accion ENUM('aprobar', 'rechazar') NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  usado_en DATETIME NULL,
  expira_en DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token (token),
  INDEX idx_actividad (actividad_id),
  CONSTRAINT fk_cp_aat_act FOREIGN KEY (actividad_id) REFERENCES cp_actividades(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_aat_apr FOREIGN KEY (aprobador_empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Locadores acordados (ajustar si el nombre en BD difiere)
UPDATE empleados SET requiere_aprobacion_horas = 1
WHERE activo = 1 AND (
  (LOWER(TRIM(nombres)) LIKE '%maria%' AND LOWER(TRIM(apellidos)) LIKE '%gil%')
  OR (LOWER(TRIM(nombres)) LIKE '%monica%' AND LOWER(TRIM(apellidos)) LIKE '%carrasco%')
  OR (LOWER(TRIM(nombres)) LIKE '%manuel%' AND LOWER(TRIM(apellidos)) LIKE '%abood%')
  OR (LOWER(TRIM(apellidos)) LIKE '%canales%' AND LOWER(TRIM(nombres)) LIKE '%rocio%')
);

SELECT 'cp_actividades_aprobacion_locadores OK' AS status;
