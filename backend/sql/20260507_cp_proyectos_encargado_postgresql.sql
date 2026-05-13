-- Bolsa de horas: encargado notificado ante cambios en actividades (PostgreSQL).

ALTER TABLE cp_proyectos
  ADD COLUMN IF NOT EXISTS encargado_empleado_id INTEGER NULL REFERENCES empleados(id) ON DELETE SET NULL;

COMMENT ON COLUMN cp_proyectos.encargado_empleado_id IS
  'Empleado notificado ante altas o ediciones de registros de horas del proyecto.';
