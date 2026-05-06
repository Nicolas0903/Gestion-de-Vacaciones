-- Consultores elegibles en Control de proyectos (lista acotada en formularios)
-- Idempotente: no falla si la columna ya existe.
USE gestor_vacaciones;

SELECT COUNT(*) INTO @col_existe
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'empleados'
  AND COLUMN_NAME = 'es_consultor_cp';

SET @sql = IF(
  @col_existe = 0,
  'ALTER TABLE empleados ADD COLUMN es_consultor_cp TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Si 1, puede asignarse en nuevos proyectos (catálogo). Gestionado en Administración de usuarios.'' AFTER activo',
  'SELECT ''Columna es_consultor_cp ya existe — sin cambios'' AS resultado'
);
PREPARE stmt_mig FROM @sql;
EXECUTE stmt_mig;
DEALLOCATE PREPARE stmt_mig;

-- Opcional: marcar consultores ya usados como habilitados (descomentar y ajustar si aplica)
-- UPDATE empleados e
-- INNER JOIN (SELECT DISTINCT empleado_id FROM cp_proyecto_consultores) pc ON pc.empleado_id = e.id
-- SET e.es_consultor_cp = 1;
