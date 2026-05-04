-- Marca períodos generados por el sistema vs carga empresa (RH).
--
-- IMPORTANTE:
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