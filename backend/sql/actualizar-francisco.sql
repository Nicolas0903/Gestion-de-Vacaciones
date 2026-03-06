-- =====================================================
-- ACTUALIZAR FRANCISCO PEREZ - Datos según Excel
-- empleado_id = 14, email = francisco.perez@prayaga.biz
-- =====================================================

USE gestor_vacaciones;

-- 1. Corregir días gozados por período (según Excel)
-- 2018-2019: 8 (de 19/12-02/01) + 14 + 8 = 30 -> gozadas
UPDATE periodos_vacaciones 
SET dias_gozados = 30, estado = 'gozadas' 
WHERE empleado_id = 14 AND observaciones LIKE '%2018-2019%';

-- 2019-2020: 6 + 7 = 13 días
UPDATE periodos_vacaciones 
SET dias_gozados = 13, estado = 'parcial' 
WHERE empleado_id = 14 AND observaciones LIKE '%2019-2020%';

-- 2. Agregar períodos faltantes (2023-2024, 2024-2025, 2025-2026)
INSERT INTO periodos_vacaciones 
  (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados, tiempo_trabajado, estado, observaciones)
VALUES 
  (14, '2023-01-02', '2024-01-01', 30, 0, '12 meses', 'pendiente', 'Periodo 2023-2024 - No Gozadas'),
  (14, '2024-01-02', '2025-01-01', 30, 0, '12 meses', 'pendiente', 'Periodo 2024-2025 - No Gozadas'),
  (14, '2025-01-02', '2026-01-01', 30, 0, '12 meses', 'pendiente', 'Periodo 2025-2026 - No Gozadas');

-- 3. Verificar resultado
SELECT 'RESUMEN FRANCISCO:' as '';
SELECT 
  SUM(dias_correspondientes) as total_ganados,
  SUM(dias_gozados) as total_gozados,
  SUM(dias_pendientes) as total_pendientes
FROM periodos_vacaciones 
WHERE empleado_id = 14;

SELECT 'PERIODOS:' as '';
SELECT id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados, dias_pendientes, estado 
FROM periodos_vacaciones 
WHERE empleado_id = 14 
ORDER BY fecha_inicio_periodo;
