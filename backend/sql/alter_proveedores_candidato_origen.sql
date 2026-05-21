-- Permite registrar varios ganadores de una misma evaluación en la lista
ALTER TABLE proveedores
  ADD COLUMN candidato_origen_id INT NULL COMMENT 'Candidato de evaluación del que proviene' AFTER evaluacion_origen_id;

ALTER TABLE proveedores
  ADD UNIQUE KEY uk_prov_candidato_origen (candidato_origen_id);

ALTER TABLE proveedores
  ADD CONSTRAINT fk_prov_candidato_origen
    FOREIGN KEY (candidato_origen_id) REFERENCES evaluacion_proveedor_candidatos(id) ON DELETE SET NULL;

-- Datos ya registrados antes del cambio
UPDATE proveedores p
INNER JOIN evaluaciones_proveedor e ON e.proveedor_registrado_id = p.id
SET p.candidato_origen_id = e.candidato_ganador_id
WHERE p.candidato_origen_id IS NULL AND e.candidato_ganador_id IS NOT NULL;
