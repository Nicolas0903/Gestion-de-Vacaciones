-- Agrega la columna `area` a la tabla `empleados`.
-- Indica el área organizacional a la que pertenece el empleado.
-- Es opcional (nullable) para que los registros existentes no requieran un
-- valor inmediato. El front muestra "Sin área" si está vacío.

ALTER TABLE empleados
  ADD COLUMN area ENUM(
    'gerencia_general',
    'consultoria',
    'administracion',
    'operaciones',
    'marketing',
    'comercial'
  ) NULL DEFAULT NULL AFTER cargo;
