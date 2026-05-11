-- Opción «otros» en requerido_por + texto libre opcional para Bolsa de horas / actividades
SET NAMES utf8mb4;

ALTER TABLE cp_actividades
  MODIFY COLUMN requerido_por ENUM(
    'ricardo_martinez',
    'rodrigo_loayza',
    'juan_pena',
    'magali_sevillano',
    'enrique_agapito',
    'otros'
  ) NOT NULL;

ALTER TABLE cp_actividades
  ADD COLUMN requerido_por_otros VARCHAR(280) NULL
    COMMENT 'Nombre libre si requerido_por es otros'
    AFTER requerido_por;
