-- Marca períodos generados por el sistema vs carga empresa (RH).
-- Base de datos: las tablas de vacaciones están en `gestor_vacaciones` (con guión bajo).
--   Ej.: mysql -u vacaciones_user -p gestor_vacaciones < backend/sql/periodos-renovacion-automatica.sql
-- NO uses `gestorvacaciones` (sin guión): ahí sólo están módulos distintos (p. ej. caja chica).
-- • Ejecutar UNA SOLA VEZ si la columna aún no existe (si existe, ignorar Duplicate column error).
-- • Tras ejecutar backend: los INSERT siguientes requieren esta columna.
--
ALTER TABLE periodos_vacaciones
  ADD COLUMN renovacion_automatica TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 = generado solo por servidor; ocultar en portal empleado hasta RH'
  AFTER observaciones;

UPDATE periodos_vacaciones
SET renovacion_automatica = 1
WHERE observaciones LIKE '%renovación automática%'
   OR observaciones LIKE '%renovacion automatica%';

-- Cuando RH confirme un período generado solo por BD, hacer visible igual que un período cargado manualmente:
-- UPDATE periodos_vacaciones SET renovacion_automatica = 0 WHERE id = …;