export const MONEDAS_RENDICION = [
  { value: 'PEN', label: 'Soles (S/)' },
  { value: 'USD', label: 'Dólares ($)' }
];

export function normalizarMonedaRendicion(v) {
  return String(v || 'PEN').trim().toUpperCase() === 'USD' ? 'USD' : 'PEN';
}

const opcionesNumeroEs = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

/** Número con coma de miles y 2 decimales (es-PE). */
export function formatoNumeroEs(monto, { decimales = 2 } = {}) {
  const n = Number(monto);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
}

export function formatoMontoRendicion(monto, moneda = 'PEN') {
  const n = Number(monto);
  if (!Number.isFinite(n)) return '—';
  const cuerpo = formatoNumeroEs(n);
  return normalizarMonedaRendicion(moneda) === 'USD' ? `$ ${cuerpo}` : `S/ ${cuerpo}`;
}

export function etiquetaMonedaRendicion(moneda = 'PEN') {
  return normalizarMonedaRendicion(moneda) === 'USD' ? 'Dólares' : 'Soles';
}
