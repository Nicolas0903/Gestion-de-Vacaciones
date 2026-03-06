-- Sincronizar estado de períodos según dias_gozados y dias_correspondientes
-- gozadas: todos los días usados
-- parcial: algunos usados
-- pendiente: ninguno usado

UPDATE periodos_vacaciones
SET estado = CASE
  WHEN dias_gozados >= dias_correspondientes THEN 'gozadas'
  WHEN dias_gozados > 0 THEN 'parcial'
  ELSE 'pendiente'
END;
