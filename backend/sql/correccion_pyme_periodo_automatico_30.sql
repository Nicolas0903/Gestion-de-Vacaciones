-- Opcional (una vez): corregir renovaciones automáticas erróneas a 30 días para régimen PYME 15.
-- Ejecutar sobre la BD del gestor, tras desplegar el fix en PeriodoVacaciones.renovarSiVencido.
--
-- mysql -u USUARIO -p gestor_vacaciones < backend/sql/correccion_pyme_periodo_automatico_30.sql

UPDATE periodos_vacaciones pv
INNER JOIN empleados e ON e.id = pv.empleado_id
SET pv.dias_correspondientes = 15
WHERE pv.observaciones LIKE '%renovación automática%'
  AND pv.dias_correspondientes = 30
  AND LOWER(TRIM(e.email)) IN ('soham.carbajal@prayaga.biz', 'nicolas.valdivia@prayaga.biz');
