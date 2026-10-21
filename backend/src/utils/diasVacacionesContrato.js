/** @param {*} valor @returns {15 | 30} */
function normalizarDiasVacacionesContrato(valor) {
  const n = parseInt(valor, 10);
  return n === 15 ? 15 : 30;
}

module.exports = { normalizarDiasVacacionesContrato };
