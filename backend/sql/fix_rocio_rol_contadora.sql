-- Rocío Picón debe tener rol contadora para gestionar Bolsa de Horas, boletas, permisos, etc.
-- Ejecutar en el servidor: mysql -u vacaciones_user -p gestor_vacaciones < backend/sql/fix_rocio_rol_contadora.sql

-- 1) Ver rol actual
SELECT e.id, e.email, e.nombres, e.apellidos, r.nombre AS rol, r.nivel_aprobacion
FROM empleados e
LEFT JOIN roles r ON e.rol_id = r.id
WHERE LOWER(TRIM(e.email)) = 'rocio.picon@prayaga.biz';

-- 2) Asignar contadora (idempotente)
UPDATE empleados e
INNER JOIN roles r ON r.nombre = 'contadora'
SET e.rol_id = r.id
WHERE LOWER(TRIM(e.email)) = 'rocio.picon@prayaga.biz';

-- 3) Confirmar
SELECT e.id, e.email, r.nombre AS rol, r.nivel_aprobacion
FROM empleados e
JOIN roles r ON e.rol_id = r.id
WHERE LOWER(TRIM(e.email)) = 'rocio.picon@prayaga.biz';
