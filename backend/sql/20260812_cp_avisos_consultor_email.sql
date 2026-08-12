-- Avisos bolsa de horas: email del consultor para copias en reporte semanal/mensual
USE gestor_vacaciones;

ALTER TABLE cp_actividades_avisos_pendientes
  ADD COLUMN consultor_empleado_id INT NULL AFTER consultor_nombre;

ALTER TABLE cp_actividades_avisos_pendientes
  ADD COLUMN consultor_email VARCHAR(255) NULL AFTER consultor_empleado_id;

SELECT 'cp_actividades_avisos_pendientes consultor_email OK' AS status;
