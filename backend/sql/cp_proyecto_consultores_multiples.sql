-- Varios consultores por proyecto (tabla puente).
-- Ejecutar UNA VEZ sobre BD que ya tenga cp_proyectos con columna consultor_asignado_id.
-- Si tus cp_proyectos ya no tienen esa columna (instalación nueva), no ejecutes este archivo.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS cp_proyecto_consultores (
  proyecto_id INT NOT NULL,
  empleado_id INT NOT NULL,
  PRIMARY KEY (proyecto_id, empleado_id),
  CONSTRAINT fk_cp_pc_proyecto FOREIGN KEY (proyecto_id) REFERENCES cp_proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_pc_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cp_proyecto_consultores (proyecto_id, empleado_id)
SELECT p.id, p.consultor_asignado_id
FROM cp_proyectos p
WHERE p.consultor_asignado_id IS NOT NULL;

ALTER TABLE cp_proyectos DROP FOREIGN KEY fk_cp_proyectos_consultor;
ALTER TABLE cp_proyectos DROP COLUMN consultor_asignado_id;
