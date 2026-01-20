-- ====================================
-- CORRECCIONES DE BASE DE DATOS
-- Fecha: 21 Enero 2026
-- ====================================

USE gestor_vacaciones;

-- ====================================
-- 1. CORREGIR JEFES DIRECTOS
-- ====================================

-- Stephanie: Solo Rocío aprueba (sin jefe directo)
UPDATE empleados 
SET jefe_id = NULL
WHERE email = 'stephanie.agapito@prayaga.biz';

-- Soham: Stephanie aprueba primero, luego Rocío
UPDATE empleados 
SET jefe_id = (SELECT id FROM (SELECT id FROM empleados WHERE email = 'stephanie.agapito@prayaga.biz') as temp)
WHERE email = 'soham.carbajal@prayaga.biz';

-- ====================================
-- 2. CORREGIR ENRIQUE AGAPITO (145 días gozados)
-- ====================================

-- Período 2023-2024: Corregir de 15 a 30 días gozados
UPDATE periodos_vacaciones 
SET dias_gozados = 30 
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'enrique.agapito@prayaga.biz')
  AND fecha_inicio_periodo = '2023-03-01'
  AND dias_correspondientes = 30;

-- ====================================
-- 3. CORREGIR SOHAM CARBAJAL (15 ganados, 16 gozados)
-- ====================================

-- Período 2024-2025: 15 días gozados (completo)
UPDATE periodos_vacaciones 
SET dias_correspondientes = 15, dias_gozados = 15, estado = 'gozadas'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'soham.carbajal@prayaga.biz')
  AND fecha_inicio_periodo = '2024-05-02';

-- Período 2025-2026: 0 días correspondientes (aún no ha iniciado), 1 día adelantado
UPDATE periodos_vacaciones 
SET dias_correspondientes = 0, dias_gozados = 1, estado = 'pendiente'
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'soham.carbajal@prayaga.biz')
  AND fecha_inicio_periodo = '2025-05-02';

-- ====================================
-- VERIFICACIÓN FINAL
-- ====================================

-- Verificar jefes directos
SELECT 
  e.nombres,
  e.email,
  j.nombres as jefe_nombre,
  j.email as jefe_email
FROM empleados e
LEFT JOIN empleados j ON e.jefe_id = j.id
WHERE e.email IN ('stephanie.agapito@prayaga.biz', 'soham.carbajal@prayaga.biz');

-- Verificar días de Enrique
SELECT 
  e.nombres,
  SUM(pv.dias_correspondientes) as total_ganados,
  SUM(pv.dias_gozados) as total_gozados
FROM periodos_vacaciones pv
JOIN empleados e ON e.id = pv.empleado_id
WHERE e.email = 'enrique.agapito@prayaga.biz'
GROUP BY e.id, e.nombres;

-- Verificar días de Soham
SELECT 
  e.nombres,
  SUM(pv.dias_correspondientes) as total_ganados,
  SUM(pv.dias_gozados) as total_gozados,
  SUM(pv.dias_correspondientes - pv.dias_gozados) as total_pendientes
FROM periodos_vacaciones pv
JOIN empleados e ON e.id = pv.empleado_id
WHERE e.email = 'soham.carbajal@prayaga.biz'
GROUP BY e.id, e.nombres;

-- ====================================
-- NOTAS:
-- ====================================
-- 1. Stephanie no tiene jefe directo, solo Rocío aprueba sus solicitudes
-- 2. Soham tiene a Stephanie como jefe directo (Stephanie → Rocío)
-- 3. Enrique ahora tiene 145 días gozados (era 130)
-- 4. Soham tiene 15 días ganados pero 16 gozados (adelantó 1 día)
--
-- Para ejecutar:
-- mysql -u root -p gestor_vacaciones < sql/correcciones-enero-2026.sql
-- ====================================
