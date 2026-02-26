-- Script para actualizar DNI de empleados
-- Ejecutar en el servidor: mysql -u root -p gestor_vacaciones < sql/actualizar-dni.sql

-- Magali Sevillano
UPDATE empleados SET dni = '09374480' WHERE nombres LIKE '%Magali%' AND apellidos LIKE '%Sevillano%';

-- Ricardo Martinez
UPDATE empleados SET dni = '09864234' WHERE nombres LIKE '%Ricardo%' AND apellidos LIKE '%Martinez%';

-- Francisco Perez
UPDATE empleados SET dni = '10012021' WHERE nombres LIKE '%Francisco%' AND apellidos LIKE '%Perez%';

-- Enrique Agapito (Victor Enrique)
UPDATE empleados SET dni = '47822678' WHERE nombres LIKE '%Enrique%' AND apellidos LIKE '%Agapito%';

-- Veronica Gonzales
UPDATE empleados SET dni = '10685507' WHERE nombres LIKE '%Veronica%' AND apellidos LIKE '%Gonzales%';

-- Stephanie Agapito
UPDATE empleados SET dni = '74565664' WHERE nombres LIKE '%Stephanie%' AND apellidos LIKE '%Agapito%';

-- Oscar Llanca
UPDATE empleados SET dni = '40948922' WHERE nombres LIKE '%Oscar%' AND apellidos LIKE '%Llanca%';

-- Luis Hurtado
UPDATE empleados SET dni = '73385504' WHERE nombres LIKE '%Luis%' AND apellidos LIKE '%Hurtado%';

-- Soham Carbajal
UPDATE empleados SET dni = '72565349' WHERE nombres LIKE '%Soham%' AND apellidos LIKE '%Carbajal%';

-- Nicolas Valdivia
UPDATE empleados SET dni = '75464668' WHERE nombres LIKE '%Nicolas%' AND apellidos LIKE '%Valdivia%';

-- Verificar los cambios
SELECT id, codigo_empleado, nombres, apellidos, dni, email 
FROM empleados 
WHERE activo = TRUE
ORDER BY apellidos, nombres;
