-- ====================================
-- CORRECCIONES FLUJO DE APROBACIÓN
-- Fecha: 21 Enero 2026
-- ====================================

USE gestor_vacaciones;

-- ====================================
-- EMPLEADOS SIN JEFE DIRECTO
-- Sus solicitudes van DIRECTO a Rocío (contadora)
-- ====================================

-- Stephanie Agapito: Sin jefe directo → Solo Rocío aprueba
UPDATE empleados 
SET jefe_id = NULL
WHERE email = 'stephanie.agapito@prayaga.biz';

-- Enrique Agapito: Sin jefe directo → Solo Rocío aprueba
UPDATE empleados 
SET jefe_id = NULL
WHERE email = 'enrique.agapito@prayaga.biz';

-- Magali Sevillano (Gerente General): Sin jefe directo → Solo Rocío aprueba
UPDATE empleados 
SET jefe_id = NULL
WHERE email = 'magali.sevillano@prayaga.biz';

-- ====================================
-- EMPLEADOS CON JEFE DIRECTO
-- Sus solicitudes pasan por: Jefe → Rocío
-- ====================================

-- Soham Carbajal: Stephanie → Rocío
UPDATE empleados 
SET jefe_id = (SELECT id FROM (SELECT id FROM empleados WHERE email = 'stephanie.agapito@prayaga.biz') as temp)
WHERE email = 'soham.carbajal@prayaga.biz';

-- ====================================
-- VERIFICACIÓN FINAL
-- ====================================

SELECT 
  e.codigo_empleado,
  e.nombres,
  e.apellidos,
  e.cargo,
  j.nombres as jefe_nombre,
  CASE 
    WHEN e.jefe_id IS NULL THEN 'Aprobación directa de Rocío'
    ELSE CONCAT('Aprobación: ', j.nombres, ' → Rocío')
  END as flujo_aprobacion
FROM empleados e
LEFT JOIN empleados j ON e.jefe_id = j.id
WHERE e.rol_id NOT IN (1, 2)  -- Excluir admin y contadora
ORDER BY e.jefe_id IS NULL DESC, e.nombres;

-- ====================================
-- NOTAS:
-- ====================================
-- FLUJO DE APROBACIÓN:
--
-- SIN jefe_id (NULL):
--   - Estado inicial: pendiente_contadora
--   - Aprobador: Rocío (contadora)
--   - Ejemplos: Stephanie, Enrique, Magali
--
-- CON jefe_id:
--   - Estado inicial: pendiente_jefe
--   - Primer aprobador: Jefe directo
--   - Segundo aprobador: Rocío (contadora)
--   - Ejemplos: Soham (Stephanie → Rocío), Nicolas (Enrique → Rocío)
-- ====================================
