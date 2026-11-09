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

  const otros_costos = (costosRaw?.otros_costos || []).map((row, i) => {
    const concepto = String(row?.concepto ?? row?.rol ?? '').trim();
    const cantidad = Number(row?.cantidad);
    const qty = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1;
    const costoDirecto = Math.round((Number(row?.costo_directo) || 0) * 100) / 100;
    const costo_final = Math.round(qty * costoDirecto * 100) / 100;
    return {
      ...row,
      concepto,
      cantidad: qty,
      costo_directo: costoDirecto,
      costo_final,
      orden: row?.orden ?? i + 1
    };
  });
  const subtotalOtros = Math.round(
    otros_costos.reduce((s, r) => {
      const tieneDato = r.concepto || r.costo_directo > 0;
      return tieneDato ? s + r.costo_final : s;
    }, 0) * 100
  ) / 100;

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
  const costoTotal = Math.round((subtotal + subtotalOtros + garantia + comision) * 100) / 100;

  const tc = tipoCambio > 0 ? tipoCambio : 1;
  const costoEnPen = monedaRec === 'PEN' ? costoTotal : Math.round(costoTotal * tc * 100) / 100;
  const costoEnUsd = monedaRec === 'USD' ? costoTotal : Math.round((costoTotal / tc) * 100) / 100;

  const monedaProy = String(params.moneda_proyeccion || 'USD').toUpperCase() === 'PEN' ? 'PEN' : 'USD';

  const proyeccionesUsd = markups.map((m) => Math.round(costoEnUsd * m * 100) / 100);
  const proyeccionesPen = markups.map((m) => Math.round(costoEnPen * m * 100) / 100);
  const proyecciones = monedaProy === 'PEN' ? proyeccionesPen : proyeccionesUsd;
  const costoBaseProy = monedaProy === 'PEN' ? costoEnPen : costoEnUsd;

  const proyActiva = Math.min(Math.max(Number(params.proyeccion_activa) || 0, 0), proyecciones.length - 1);
  const proyeccionAuto = proyecciones[proyActiva] ?? 0;
  const manualTotal = params.total_general_manual;
  const totalGeneral =
    manualTotal != null && manualTotal !== '' && Number.isFinite(Number(manualTotal))
      ? Math.round(Number(manualTotal) * 100) / 100
      : Math.round(proyeccionAuto * 100) / 100;
  const impTipo = String(params.impuesto_tipo || 'igv').toLowerCase();
  const impPct = Number(params.impuesto_pct ?? params.igv_pct ?? 18);
  let impuestoEtiqueta = 'IGV';
  if (impTipo === 'renta') impuestoEtiqueta = 'Imp. a la renta';
  if (impTipo === 'otros') {
    impuestoEtiqueta = String(params.impuesto_otros_etiqueta || '').trim() || 'Otros impuestos';
  }
  const impuestoAplica = params.impuesto_aplica !== false;
  let impuestoAuto = 0;
  if (impuestoAplica && (impTipo === 'igv' || impTipo === 'renta')) {
    impuestoAuto = Math.round(totalGeneral * (impPct / 100) * 100) / 100;
  }
  const impManual = params.impuesto_monto;
  const impuestoMonto =
    impManual != null && impManual !== '' && Number.isFinite(Number(impManual))
      ? Math.round(Number(impManual) * 100) / 100
      : impuestoAuto;
  const proyeccionSel = totalGeneral;
  const igvPct = impTipo === 'igv' ? impPct : Number(params.igv_pct ?? 18);
  const igvProy = impuestoMonto;
  const precioFinal = Math.round((totalGeneral + impuestoMonto) * 100) / 100;
  const margen =
    totalGeneral > 0
      ? Math.round(((totalGeneral - costoBaseProy) / totalGeneral) * 10000) / 100
      : 0;

  return {
    recursos,
    otros_costos,
    markups,
    proyActiva,
    monedaProy,
    monedaRec,
    resumen: {
      subtotal_recursos: subtotal,
      subtotal_otros_costos: subtotalOtros,
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
      proyeccion_auto: Math.round(proyeccionAuto * 100) / 100,
      proyeccion_seleccionada: proyeccionSel,
      total_general: totalGeneral,
      impuesto_tipo: impTipo,
      impuesto_etiqueta: impuestoEtiqueta,
      impuesto_pct: impPct,
      impuesto_monto: impuestoMonto,
      impuesto_monto_auto: impuestoAuto,
      igv_proyeccion: igvProy,
      precio_final_cliente: precioFinal,
      margen_pct: margen,
      igv_pct: igvPct
    }
  };
}
