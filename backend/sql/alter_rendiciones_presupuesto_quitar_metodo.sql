-- Migración: quitar las columnas de método de cobro en `rendiciones_presupuesto`.
-- La información del método (Yape/Plin/transferencia, celular, nombre de cuenta,
-- CCI) se gestiona externamente; este módulo no la persiste.
--
-- Solo se necesita correr en bases donde ya se haya ejecutado el script inicial
-- (`rendiciones_presupuesto.sql`) en una versión previa.

ALTER TABLE rendiciones_presupuesto
  DROP COLUMN metodo_reembolso,
  DROP COLUMN celular,
  DROP COLUMN nombre_en_metodo,
  DROP COLUMN numero_cuenta;
