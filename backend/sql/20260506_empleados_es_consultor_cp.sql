-- Consultores elegibles en Control de proyectos (lista acotada en formularios)
USE gestor_vacaciones;

ALTER TABLE empleados
  ADD COLUMN es_consultor_cp TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Si 1, puede asignarse en nuevos proyectos (catálogo). Gestionado en Administración de usuarios.'
  AFTER activo;

-- Opcional: marcar consultores ya usados como habilitados (descomentar y ajustar si aplica)
-- UPDATE empleados e
-- INNER JOIN (SELECT DISTINCT empleado_id FROM cp_proyecto_consultores) pc ON pc.empleado_id = e.id
-- SET e.es_consultor_cp = 1;
