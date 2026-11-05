/** Muestra vacío en lugar de 0 fijo para poder borrar y tipear sin confusión. */
export function valorNumInputEditable(v) {
  if (v === null || v === undefined || v === '') return '';
  return v;
}

export function parcheNumInputEditable(raw) {
  const s = typeof raw === 'string' ? raw.trim() : raw;
  if (s === '' || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
