const ESTADOS_HITO = new Set(['enviada', 'ganada', 'perdida']);

/** Indica si conviene publicar una versión (cambios principales, no cada guardado). */
export function evaluarSugerenciaVersion(anterior, actual) {
  const motivos = [];
  if (!anterior || !actual) return { sugerir: false, motivos };

  const g0 = anterior.general || {};
  const g1 = actual.general || {};
  const c0 = anterior.calculados || {};
  const c1 = actual.calculados || {};

  if (g0.estado !== g1.estado && ESTADOS_HITO.has(g1.estado)) {
    motivos.push(`Cambió el estado a «${g1.estado}» (hito comercial).`);
  }
  if (String(g0.cliente || '').trim() !== String(g1.cliente || '').trim()) {
    motivos.push('Cambió el cliente.');
  }
  if (String(g0.tipo_proyecto || '').trim() !== String(g1.tipo_proyecto || '').trim()) {
    motivos.push('Cambió el tipo de proyecto.');
  }

  const m0 = Number(c0.monto_propuesta ?? c0.precio_final_cliente) || 0;
  const m1 = Number(c1.monto_propuesta ?? c1.precio_final_cliente) || 0;
  if (m0 > 0 && m1 > 0) {
    const delta = Math.abs(m1 - m0) / m0;
    if (delta >= 0.05) {
      motivos.push(`El monto de propuesta varió ${(delta * 100).toFixed(1)} % (≥ 5 %).`);
    }
  }

  const h0 = Number(anterior.actividades?.total_horas_perfiles ?? anterior.actividades?.total_horas) || 0;
  const h1 = Number(actual.actividades?.total_horas_perfiles ?? actual.actividades?.total_horas) || 0;
  if (h0 > 0 && h1 > 0 && Math.abs(h1 - h0) / h0 >= 0.1) {
    motivos.push('Cambió el dimensionamiento de horas (≥ 10 %).');
  }

  return { sugerir: motivos.length > 0, motivos };
}

export const CRITERIOS_VERSION_TEXTO = [
  'Envío o reenvío formal al cliente (estado Enviada).',
  'Cierre comercial: Ganada o Perdida.',
  'Variación ≥ 5 % en monto de propuesta o ≥ 10 % en horas del alcance.',
  'Cambio de cliente o tipo de proyecto.',
  'Los ajustes menores se guardan en borrador sin nueva versión.'
];
