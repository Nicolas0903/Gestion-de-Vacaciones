export const MONEDAS_RENDICION = [
  { value: 'PEN', label: 'Soles (S/)' },
  { value: 'USD', label: 'Dólares ($)' }
];

export function normalizarMonedaRendicion(v) {
  return String(v || 'PEN').trim().toUpperCase() === 'USD' ? 'USD' : 'PEN';
}

export function formatoMontoRendicion(monto, moneda = 'PEN') {
  const n = Number(monto);
  if (Number.isNaN(n)) return '—';
  return normalizarMonedaRendicion(moneda) === 'USD' ? `$ ${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`;
}

export function etiquetaMonedaRendicion(moneda = 'PEN') {
  return normalizarMonedaRendicion(moneda) === 'USD' ? 'Dólares' : 'Soles';
}
