-- Permite cierres históricos sin cotización vinculada en el portal

ALTER TABLE cierres_negocio
  MODIFY cotizacion_id INT NULL,
  MODIFY cotizacion_version_num INT NULL DEFAULT NULL;
