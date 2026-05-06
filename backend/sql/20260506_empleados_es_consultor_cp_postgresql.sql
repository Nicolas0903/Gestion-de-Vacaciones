-- Consultores elegibles en Control de proyectos (PostgreSQL)
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS es_consultor_cp BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN empleados.es_consultor_cp IS
  'Si true, puede asignarse en nuevos proyectos. Gestionado en Administración de usuarios.';
