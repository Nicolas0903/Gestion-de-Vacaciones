-- ====================================
-- SCRIPT DE ACTUALIZACIÓN DE DÍAS GOZADOS
-- Fecha: 20 Enero 2026
-- Propósito: Corregir días gozados que no se actualizaron correctamente
-- ====================================

USE gestor_vacaciones;

-- ====================================
-- 1. VERONICA GONZALES (54 días gozados)
-- ====================================

-- Períodos gozados completamente (2021-2022 y 2022-2023)
UPDATE periodos_vacaciones 
SET dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'veronica.gonzales@prayaga.biz')
  AND dias_correspondientes = 15 
  AND observaciones LIKE '%Gozadas%';

-- Período 2023-2024: 6 días gozados (parcial)
UPDATE periodos_vacaciones 
SET dias_gozados = 6, estado = 'parcial'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'veronica.gonzales@prayaga.biz')
  AND dias_correspondientes = 30 
  AND observaciones LIKE '%27 ago 24%' 
  LIMIT 1;

-- Período 2024-2025: 18 días gozados (parcial)
UPDATE periodos_vacaciones 
SET dias_gozados = 18, estado = 'parcial'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'veronica.gonzales@prayaga.biz')
  AND dias_correspondientes = 30 
  AND estado = 'pendiente'
  AND observaciones LIKE '%2024-2025%';

-- ====================================
-- 2. OSCAR LLANCA (30 días gozados)
-- ====================================

UPDATE periodos_vacaciones 
SET dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'oscar.llanca@prayaga.biz')
  AND observaciones LIKE '%Gozado%';

-- ====================================
-- 3. SOHAM CARBAJAL (16 días gozados, pero solo 15 ganados)
-- ====================================

-- Período 2024-2025: 15 días gozados (completo)
UPDATE periodos_vacaciones 
SET dias_correspondientes = 15, dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'soham.carbajal@prayaga.biz')
  AND fecha_inicio_periodo = '2024-05-02';

-- Período 2025-2026: 1 día adelantado (el período aún no ha iniciado, por eso dias_correspondientes = 0)
UPDATE periodos_vacaciones 
SET dias_correspondientes = 0, dias_gozados = 1, estado = 'pendiente'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'soham.carbajal@prayaga.biz')
  AND fecha_inicio_periodo = '2025-05-02';

-- ====================================
-- 4. STEPHANIE AGAPITO (48 días gozados)
-- ====================================

-- Períodos completamente gozados
UPDATE periodos_vacaciones 
SET dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'stephanie.agapito@prayaga.biz')
  AND observaciones LIKE '%Gozadas%';

-- Período parcialmente gozado (2023-2024)
UPDATE periodos_vacaciones 
SET dias_gozados = 18, estado = 'parcial'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'stephanie.agapito@prayaga.biz')
  AND observaciones LIKE '%Gozado%';

-- ====================================
-- 5. ENRIQUE AGAPITO (130 días gozados)
-- ====================================

-- Períodos completamente gozados (2017-2024)
UPDATE periodos_vacaciones 
SET dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'enrique.agapito@prayaga.biz')
  AND dias_correspondientes = 15
  AND observaciones LIKE '%Gozado%';

-- Período 2023-2024: 30 días gozados (completo)
UPDATE periodos_vacaciones 
SET dias_gozados = 30, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'enrique.agapito@prayaga.biz')
  AND dias_correspondientes = 30
  AND observaciones LIKE '%2023-2024%';

-- Período 2024-2025: 25 días gozados (parcial)
UPDATE periodos_vacaciones 
SET dias_gozados = 25, estado = 'parcial'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'enrique.agapito@prayaga.biz')
  AND dias_correspondientes = 30
  AND observaciones LIKE '%2024-2025%';

-- ====================================
-- VERIFICACIÓN FINAL
-- ====================================

SELECT 
  e.nombres,
  e.apellidos,
  SUM(pv.dias_correspondientes) as total_ganados,
  SUM(pv.dias_gozados) as total_gozados,
  SUM(pv.dias_correspondientes - pv.dias_gozados) as total_pendientes
FROM periodos_vacaciones pv
JOIN empleados e ON e.id = pv.empleado_id
WHERE e.email IN (
  'veronica.gonzales@prayaga.biz',
  'oscar.llanca@prayaga.biz',
  'soham.carbajal@prayaga.biz',
  'stephanie.agapito@prayaga.biz',
  'enrique.agapito@prayaga.biz'
)
GROUP BY e.id, e.nombres, e.apellidos
ORDER BY e.nombres;

-- ====================================
-- NOTAS IMPORTANTES:
-- ====================================
-- 1. Este script corrige los días gozados que no se actualizaron correctamente
--    debido a que las condiciones LIKE en los scripts de creación no coincidían
--    con las observaciones reales en la base de datos.
--
-- 2. SOHAM tiene un caso especial: adelantó 1 día del período 2025-2026 que
--    aún no ha iniciado, por eso ese período tiene dias_correspondientes = 0
--    pero dias_gozados = 1, resultando en -1 días pendientes.
--
-- 3. Para ejecutar este script:
--    mysql -u root -p gestor_vacaciones < sql/actualizar-dias-gozados.sql
-- ====================================
