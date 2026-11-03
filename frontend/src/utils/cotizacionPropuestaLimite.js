export function limiteTotalFinalPropuesta(propuesta) {
  let lim = Number(propuesta?.limite_total_final);
  if (!Number.isFinite(lim) || lim <= 0) {
    lim = Number(propuesta?.totales?.total_inversion);
  }
  return Number.isFinite(lim) && lim > 0 ? lim : 0;
}

export function totalFinalPropuestaParaTope(totales) {
  const tInv = Number(totales?.total_inversion) || 0;
  const tDet = Number(totales?.detalle_final) || 0;
  return Math.max(tInv, tDet);
}

export function propuestaComercialExcedeLimite(propuesta, totalesCalc) {
  const limite = limiteTotalFinalPropuesta(propuesta);
  if (limite <= 0) return false;
  const total = totalFinalPropuestaParaTope(totalesCalc);
  return total > limite + 0.02;
}
