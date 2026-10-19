ALTER TABLE cotizacion_solicitudes
  ADD COLUMN IF NOT EXISTS responsable_id INT NULL AFTER solicitante_id,
  ADD CONSTRAINT fk_sol_cot_responsable FOREIGN KEY (responsable_id) REFERENCES empleados(id) ON DELETE SET NULL;
