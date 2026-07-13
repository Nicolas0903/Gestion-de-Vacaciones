-- Apelación de solicitudes de vacaciones rechazadas
-- Idempotente: se puede ejecutar más de una vez sin error.
-- Ejecutar sobre gestor_vacaciones

USE gestor_vacaciones;

-- 1) Ampliar ENUM de estado (solo si falta rechazada_definitiva)
SELECT COLUMN_TYPE INTO @tipo_estado
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'solicitudes_vacaciones'
  AND COLUMN_NAME = 'estado';

SET @sql_estado = IF(
  @tipo_estado IS NOT NULL AND @tipo_estado NOT LIKE '%rechazada_definitiva%',
  'ALTER TABLE solicitudes_vacaciones MODIFY COLUMN estado ENUM(
    ''borrador'',
    ''pendiente_jefe'',
    ''pendiente_contadora'',
    ''aprobada'',
    ''rechazada'',
    ''rechazada_definitiva'',
    ''cancelada''
  ) NOT NULL DEFAULT ''borrador''',
  'SELECT ''ENUM estado ya incluye rechazada_definitiva — sin cambios'' AS resultado'
);
PREPARE stmt_estado FROM @sql_estado;
EXECUTE stmt_estado;
DEALLOCATE PREPARE stmt_estado;

-- 2) motivo_apelacion
SELECT COUNT(*) INTO @col_motivo
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'solicitudes_vacaciones'
  AND COLUMN_NAME = 'motivo_apelacion';

SET @sql_motivo = IF(
  @col_motivo = 0,
  'ALTER TABLE solicitudes_vacaciones ADD COLUMN motivo_apelacion TEXT NULL COMMENT ''Motivo ingresado por el colaborador al apelar'' AFTER observaciones',
  'SELECT ''Columna motivo_apelacion ya existe — sin cambios'' AS resultado'
);
PREPARE stmt_motivo FROM @sql_motivo;
EXECUTE stmt_motivo;
DEALLOCATE PREPARE stmt_motivo;

-- 3) fecha_apelacion
SELECT COUNT(*) INTO @col_fecha
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'solicitudes_vacaciones'
  AND COLUMN_NAME = 'fecha_apelacion';

SET @sql_fecha = IF(
  @col_fecha = 0,
  'ALTER TABLE solicitudes_vacaciones ADD COLUMN fecha_apelacion DATETIME NULL AFTER motivo_apelacion',
  'SELECT ''Columna fecha_apelacion ya existe — sin cambios'' AS resultado'
);
PREPARE stmt_fecha FROM @sql_fecha;
EXECUTE stmt_fecha;
DEALLOCATE PREPARE stmt_fecha;

-- 4) apelacion_usada
SELECT COUNT(*) INTO @col_usada
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'solicitudes_vacaciones'
  AND COLUMN_NAME = 'apelacion_usada';

SET @sql_usada = IF(
  @col_usada = 0,
  'ALTER TABLE solicitudes_vacaciones ADD COLUMN apelacion_usada TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''1 = ya apeló (máximo una vez)'' AFTER fecha_apelacion',
  'SELECT ''Columna apelacion_usada ya existe — sin cambios'' AS resultado'
);
PREPARE stmt_usada FROM @sql_usada;
EXECUTE stmt_usada;
DEALLOCATE PREPARE stmt_usada;

SELECT 'apelacion solicitudes_vacaciones OK' AS status;
