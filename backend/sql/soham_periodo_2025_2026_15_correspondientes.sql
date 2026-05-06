-- Soham Carbajal: corregir período 2025-2026 (régimen 15 días).
-- Los scripts actualizar-dias-gozados.sql y correcciones-enero-2026.sql pusieron
-- dias_correspondientes = 0 para reflejar "adelanto antes de iniciar el período",
-- pero eso muestra 0 vacaciones en la UI y estados incoherentes (p. ej. "gozadas").
-- Modelo correcto: 15 días del período, 1 adelantado → parcial, 14 pendientes.
--
-- mysql -u USUARIO -p gestor_vacaciones < backend/sql/soham_periodo_2025_2026_15_correspondientes.sql

UPDATE periodos_vacaciones pv
INNER JOIN empleados e ON e.id = pv.empleado_id
SET
  pv.dias_correspondientes = 15,
  pv.estado = CASE
    WHEN pv.dias_gozados >= 15 THEN 'gozadas'
    WHEN pv.dias_gozados > 0 THEN 'parcial'
    ELSE 'pendiente'
  END
WHERE LOWER(TRIM(e.email)) = 'soham.carbajal@prayaga.biz'
  AND pv.fecha_inicio_periodo = '2025-05-02';
