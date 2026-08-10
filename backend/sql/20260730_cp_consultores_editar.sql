-- Migraciones idempotentes para editar proyectos (consultores-select al pulsar Editar).
-- Ejecutar en el servidor si falla GET /api/control-proyectos/consultores-select?proyecto_id=N

SET NAMES utf8mb4;

-- 1) Columna es_consultor_cp en empleados
SELECT COUNT(*) INTO @col_es_consultor
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'empleados'
  AND COLUMN_NAME = 'es_consultor_cp';

SET @sql = IF(
  @col_es_consultor = 0,
  'ALTER TABLE empleados ADD COLUMN es_consultor_cp TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Consultor asignable en bolsa de horas'' AFTER activo',
  'SELECT ''es_consultor_cp ya existe'' AS ok'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Tabla puente consultores por proyecto
CREATE TABLE IF NOT EXISTS cp_proyecto_consultores (
  proyecto_id INT NOT NULL,
  empleado_id INT NOT NULL,
  PRIMARY KEY (proyecto_id, empleado_id),
  CONSTRAINT fk_cp_pc_proyecto FOREIGN KEY (proyecto_id) REFERENCES cp_proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_pc_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Migrar consultor legacy si aún existe la columna (instalaciones antiguas)
SELECT COUNT(*) INTO @col_consultor_legacy
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'cp_proyectos'
  AND COLUMN_NAME = 'consultor_asignado_id';

SET @sql2 = IF(
  @col_consultor_legacy > 0,
  'INSERT IGNORE INTO cp_proyecto_consultores (proyecto_id, empleado_id)
   SELECT p.id, p.consultor_asignado_id FROM cp_proyectos p WHERE p.consultor_asignado_id IS NOT NULL',
  'SELECT ''sin columna consultor_asignado_id — omitido'' AS ok'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
