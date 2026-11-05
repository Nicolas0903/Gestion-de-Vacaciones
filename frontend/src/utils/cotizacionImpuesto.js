/** Impuesto al precio cliente (Costos) e IGV en Propuesta comparten este flag. */
export function impuestoAplicaEnCostos(parametros) {
  if (!parametros || parametros.impuesto_aplica === undefined) return true;
  return parametros.impuesto_aplica !== false;
}

export function igvPctEfectivo(propuesta, costos) {
  const params = costos?.parametros || {};
  const aplicaProp = propuesta?.igv_aplica;
  const aplica =
    aplicaProp !== undefined && aplicaProp !== null ? aplicaProp !== false : impuestoAplicaEnCostos(params);
  if (!aplica) return 0;
  return Number(propuesta?.igv_pct ?? params.impuesto_pct ?? params.igv_pct ?? 18);
}
