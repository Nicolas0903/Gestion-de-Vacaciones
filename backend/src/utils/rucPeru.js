/** Normaliza RUC peruano: solo dígitos, máximo 11. */
function normalizarRuc(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.slice(0, 11);
}

function validarRuc(raw) {
  const ruc = normalizarRuc(raw);
  if (!ruc) return { ok: false, ruc: '', mensaje: null };
  if (ruc.length !== 11) {
    return { ok: false, ruc, mensaje: 'El RUC debe tener 11 dígitos.' };
  }
  return { ok: true, ruc, mensaje: null };
}

module.exports = { normalizarRuc, validarRuc };
