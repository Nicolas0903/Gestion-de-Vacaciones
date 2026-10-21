-- Días de vacaciones anuales según contrato (PYME 15 / estándar 30)
ALTER TABLE empleados
  ADD COLUMN dias_vacaciones_contrato TINYINT NOT NULL DEFAULT 30
  COMMENT 'Días de vacaciones por año de contrato: 15 o 30'
  AFTER fecha_ingreso;

-- Legacy: correos que ya usaban régimen 15 vía env VACACIONES_PYME_15_EMAILS
UPDATE empleados
SET dias_vacaciones_contrato = 15
WHERE LOWER(TRIM(email)) IN (
  'soham.carbajal@prayaga.biz',
  'nicolas.valdivia@prayaga.biz'
);
