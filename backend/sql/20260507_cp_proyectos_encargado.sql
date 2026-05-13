-- Bolsa de horas: persona que recibe avisos por cambios en registros del proyecto (MySQL).
-- Ejecutar una vez sobre la BD existente después de control_proyectos.sql.

ALTER TABLE cp_proyectos
  ADD COLUMN encargado_empleado_id INT NULL
    COMMENT 'Empleado (portal) notificado ante altas/edición de actividades/hrs del proyecto';

ALTER TABLE cp_proyectos
  ADD CONSTRAINT fk_cp_proy_encargado
  FOREIGN KEY (encargado_empleado_id) REFERENCES empleados(id) ON DELETE SET NULL;
