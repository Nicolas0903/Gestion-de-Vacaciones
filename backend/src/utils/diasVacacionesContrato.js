const MIN_DIAS = 1;
const MAX_DIAS = 60;

/** @param {*} valor @returns {number} */
function normalizarDiasVacacionesContrato(valor) {
  const n = parseInt(valor, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(MAX_DIAS, Math.max(MIN_DIAS, n));
}

module.exports = { normalizarDiasVacacionesContrato, MIN_DIAS, MAX_DIAS };
