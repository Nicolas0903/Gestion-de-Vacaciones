export const DEFAULT_MARKUPS_COTIZACION = [1.9, 1.6, 1.7, 1.43];

function resolverIndicesGarantia(params) {
  if (Array.isArray(params?.recursos_garantia_idx) && params.recursos_garantia_idx.length) {
    return [...new Set(params.recursos_garantia_idx.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0))];
  }
  const one = Number(params?.recurso_garantia_idx);
  return Number.isFinite(one) ? [one] : [0];
}

/** Suma del costo/hora de cada recurso marcado (no promedio). */
export function tarifaGarantiaReferencia(recursos, indices, horasMes) {
  const hm = horasMes || 160;
  const rates = indices
    .map((i) => recursos[i])
    .filter(Boolean)
    .map((r) => {
      const ch = Number(r.costo_hora);
      if (Number.isFinite(ch) && ch > 0) return ch;
      return hm > 0 ? Math.round(((Number(r.salario) || 0) / hm) * 100) / 100 : 0;
    })
    .filter((t) => t > 0);
  if (!rates.length) return 0;
  return Math.round(rates.reduce((a, b) => a + b, 0) * 100) / 100;
}

/** Misma lógica que la pestaña Costos (alineada al backend). */
export function calcCostosLocal(costosRaw) {
  const params = costosRaw?.parametros || {};
  const horasMes = Number(params.horas_mes) || 160;
  const tipoCambio = Number(params.tipo_cambio) || 3.4;
  const monedaRec =
    String(params.moneda_recursos || 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN';
  const markups = (params.markups?.length ? params.markups : DEFAULT_MARKUPS_COTIZACION)
    .slice(0, 4)
    .map((m) => Number(m) || 1);
  while (markups.length < 4) markups.push(DEFAULT_MARKUPS_COTIZACION[markups.length] || 1);

  const recursos = (costosRaw?.recursos || []).map((r) => {
    const salario = Number(r.salario) || 0;
    const cantidad = Number(r.cantidad) || 1;
    const horas = Number(r.horas_asignadas ?? r.horas ?? r.tiempo_meses) || 0;
    const sobrecosto = Number(r.sobrecosto) || 1;
    const costoHora = horasMes > 0 ? Math.round((salario / horasMes) * 100) / 100 : 0;
    const costoDirecto = Math.round(costoHora * horas * cantidad * 100) / 100;
    const costoFinal = Math.round(costoDirecto * sobrecosto * 100) / 100;
    return {
      ...r,
      horas_asignadas: horas,
      costo_hora: costoHora,
      costo_directo: costoDirecto,
      costo_final: costoFinal
    };
  });

  const participantes = recursos.filter((r) => !r.es_informativo);
  const subtotal = Math.round(participantes.reduce((s, r) => s + r.costo_final, 0) * 100) / 100;

  const indicesGarantia = resolverIndicesGarantia(params);
  const horasGarantia = Number(params.horas_garantia ?? params.dias_garantia) || 0;
  const modoGarantia = String(params.garantia_modo || 'recursos').toLowerCase();
  let tarifaGarantia =
    modoGarantia === 'manual'
      ? Number(params.tarifa_garantia) || 0
      : tarifaGarantiaReferencia(recursos, indicesGarantia, horasMes);
  if (modoGarantia !== 'manual' && !tarifaGarantia) {
    tarifaGarantia = Number(params.tarifa_garantia) || 0;
  }
  tarifaGarantia = Math.round(tarifaGarantia * 100) / 100;
  const garantia =
    horasGarantia > 0 && tarifaGarantia > 0
      ? Math.round(tarifaGarantia * horasGarantia * 100) / 100
      : 0;

  const comisionPct = Number(params.comision_admin_pct ?? 10);
  const comision = Math.round(subtotal * (comisionPct / 100) * 100) / 100;
  const costoTotal = Math.round((subtotal + garantia + comision) * 100) / 100;

  const tc = tipoCambio > 0 ? tipoCambio : 1;
  const costoEnPen = monedaRec === 'PEN' ? costoTotal : Math.round(costoTotal * tc * 100) / 100;
  const costoEnUsd = monedaRec === 'USD' ? costoTotal : Math.round((costoTotal / tc) * 100) / 100;

  const monedaProy = String(params.moneda_proyeccion || 'USD').toUpperCase() === 'PEN' ? 'PEN' : 'USD';

  const proyeccionesUsd = markups.map((m) => Math.round(costoEnUsd * m * 100) / 100);
  const proyeccionesPen = markups.map((m) => Math.round(costoEnPen * m * 100) / 100);
  const proyecciones = monedaProy === 'PEN' ? proyeccionesPen : proyeccionesUsd;
  const costoBaseProy = monedaProy === 'PEN' ? costoEnPen : costoEnUsd;

  const proyActiva = Math.min(Math.max(Number(params.proyeccion_activa) || 0, 0), proyecciones.length - 1);
  const proyeccionSel = proyecciones[proyActiva] ?? 0;
  const igvPct = Number(params.igv_pct ?? 18);
  const igvProy = Math.round(proyeccionSel * (igvPct / 100) * 100) / 100;
  const precioFinal = Math.round((proyeccionSel + igvProy) * 100) / 100;
  const margen =
    proyeccionSel > 0 ? Math.round(((proyeccionSel - costoBaseProy) / proyeccionSel) * 10000) / 100 : 0;

  return {
    recursos,
    markups,
    proyActiva,
    monedaProy,
    monedaRec,
    resumen: {
      subtotal_recursos: subtotal,
      garantia,
      garantia_tarifa: tarifaGarantia,
      garantia_horas: horasGarantia,
      comision,
      comision_pct: comisionPct,
      costo_total: costoTotal,
      costo_total_usd: costoEnUsd,
      costo_total_pen: costoEnPen,
      costo_base_proyeccion: costoBaseProy,
      proyecciones,
      proyecciones_usd: proyeccionesUsd,
      proyecciones_pen: proyeccionesPen,
      proyeccion_seleccionada: proyeccionSel,
      igv_proyeccion: igvProy,
      precio_final_cliente: precioFinal,
      margen_pct: margen,
      igv_pct: igvPct
    }
  };
}
