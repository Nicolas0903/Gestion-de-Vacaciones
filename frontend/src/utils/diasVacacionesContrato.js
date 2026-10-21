export const MIN_DIAS_VACACIONES_CONTRATO = 1;
export const MAX_DIAS_VACACIONES_CONTRATO = 60;

/** @param {number | string | null | undefined} valor */
export function normalizarDiasVacacionesContrato(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(MAX_DIAS_VACACIONES_CONTRATO, Math.max(MIN_DIAS_VACACIONES_CONTRATO, n));
}

/** @param {{ dias_vacaciones_contrato?: number | string | null }} empleado */
export function parseModoDiasVacacionesContrato(empleado) {
  const dias = normalizarDiasVacacionesContrato(empleado?.dias_vacaciones_contrato);
  if (dias === 15) return { modo: '15', otro: '' };
  if (dias === 30) return { modo: '30', otro: '' };
  return { modo: 'otro', otro: String(dias) };
}

/** @param {'15'|'30'|'otro'} modo @param {string} otro */
export function resolverDiasVacacionesContrato(modo, otro) {
  if (modo === '15') return 15;
  if (modo === '30') return 30;
  return normalizarDiasVacacionesContrato(otro);
}
