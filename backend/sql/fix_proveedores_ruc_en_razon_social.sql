-- Corrige proveedores cuya razón social quedó guardada como RUC (11 dígitos).
-- Ejecutar solo si aplica; luego completar la razón social manualmente en el portal.

UPDATE proveedores
SET ruc = TRIM(razon_social),
    razon_social = CONCAT('PENDIENTE — completar razón social (RUC ', TRIM(razon_social), ')')
WHERE activo = 1
  AND razon_social REGEXP '^[0-9]{11}$'
  AND (ruc IS NULL OR TRIM(ruc) = '');
