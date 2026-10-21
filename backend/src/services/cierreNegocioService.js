function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function round2(n) {
  return Math.round(num(n) * 100) / 100;
}

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function montoTotalPropuesta(snapshot) {
  const prop = snapshot?.propuesta || {};
  const calc = snapshot?.calculados || {};
  return (
    num(prop.totales?.total_inversion) ||
    num(prop.monto_propuesta) ||
    num(calc.monto_propuesta) ||
    num(calc.precio_final_cliente) ||
    num(calc.proyeccion_seleccionada)
  );
}

function facturacionDesdeCotizacion(snapshot) {
  const prop = snapshot?.propuesta || {};
  const pagos = prop.pagos_entregables?.length ? prop.pagos_entregables : prop.pagos || [];
  const roles = prop.inversion_roles?.length ? prop.inversion_roles : prop.items || [];
  const igvPct = num(prop.igv_pct ?? snapshot?.costos?.parametros?.igv_pct, 18) / 100;

  if (pagos.length) {
    const totalProp = montoTotalPropuesta(snapshot) ||
      roles.reduce((s, r) => s + num(r.inversion) * (1 + igvPct), 0);

    return pagos.map((p, i) => {
      const pct = num(p.porcentaje) || 1 / pagos.length;
      const montoConIgv = num(p.monto) || round2(totalProp * pct);
      const base = igvPct > 0 ? round2(montoConIgv / (1 + igvPct)) : montoConIgv;
      return {
        factura: '',
        descripcion: String(p.descripcion || `Pago ${i + 1}`).trim(),
        cantidad: 1,
        precio_unitario: base,
        aplica_igv: 1,
        total_venta: round2(base),
        orden: i + 1
      };
    });
  }

  return roles.map((r, i) => ({
    factura: '',
    descripcion: String(r.actividad || r.rol || `Ítem ${i + 1}`).trim(),
    cantidad: num(r.cantidad, 1),
    precio_unitario: num(r.inversion),
    aplica_igv: 1,
    total_venta: num(r.inversion),
    orden: i + 1
  }));
}

function costosDesdeCotizacion(snapshot) {
  const prop = snapshot?.propuesta || {};
  const pagos = prop.pagos_entregables?.length ? prop.pagos_entregables : prop.pagos || [];
  const roles = prop.inversion_roles?.length ? prop.inversion_roles : prop.items || [];
  const recursos = (snapshot?.costos?.recursos || []).filter((r) => !r.es_informativo);
  const igvPct = num(prop.igv_pct ?? snapshot?.costos?.parametros?.igv_pct, 18) / 100;
  const totalCostoProy = round2(recursos.reduce((s, r) => s + num(r.costo_final ?? r.costo), 0));
  const totalVenta = montoTotalPropuesta(snapshot);

  if (pagos.length) {
    return pagos.map((p, i) => {
      const pct = num(p.porcentaje) || 1 / pagos.length;
      const montoConIgv = num(p.monto) || round2(totalVenta * pct);
      const ventaBase = igvPct > 0 ? round2(montoConIgv / (1 + igvPct)) : montoConIgv;
      const totalCosto = round2(totalCostoProy * pct);
      const utilidad = round2(ventaBase - totalCosto);
      const margen = ventaBase > 0 ? round2((utilidad / ventaBase) * 100) : 0;
      const titulo = String(
        p.descripcion || p.nombre || roles[i]?.actividad || roles[i]?.rol || `Entregable ${i + 1}`
      ).trim();
      return {
        fase: 'reporte',
        titulo,
        cantidad: 1,
        precio_unitario: totalCosto,
        total_costo: totalCosto,
        utilidad: utilidad > 0 ? utilidad : 0,
        margen_pct: margen,
        proveedor: titulo,
        observacion: '',
        orden: i + 1
      };
    });
  }

  const ventaEst = num(prop.totales?.inversion_total) || totalVenta;
  return recursos.map((r, i) => {
    const totalCosto = num(r.costo_final ?? r.costo);
    const share = ventaEst / Math.max(recursos.length, 1);
    const utilidad = round2(share - totalCosto);
    const margen = share > 0 ? round2((utilidad / share) * 100) : 0;
    return {
      fase: 'reporte',
      titulo: String(r.rol || `Recurso ${i + 1}`).trim(),
      cantidad: num(r.cantidad, 1),
      precio_unitario: num(r.salario),
      total_costo: totalCosto,
      utilidad: utilidad > 0 ? utilidad : 0,
      margen_pct: margen > 0 ? margen : 0,
      proveedor: String(r.rol || '').trim(),
      observacion: '',
      orden: i + 1
    };
  });
}

function facturacionVacia(facturacion) {
  if (!facturacion?.length) return true;
  return facturacion.every((f) => num(f.total_venta) === 0 && num(f.precio_unitario) === 0);
}

function monedaDesdeSnapshot(snapshot) {
  const m = String(snapshot?.costos?.parametros?.moneda || 'PEN').trim().toUpperCase();
  return m === 'USD' ? 'USD' : 'PEN';
}

function snapshotTieneActividades(snapshot) {
  return (snapshot?.actividades?.bloques || []).some((b) => (b.actividades || []).length > 0);
}

function snapshotTieneDatos(snapshot) {
  return (
    snapshotTieneActividades(snapshot) ||
    snapshotTieneEconomicos(snapshot) ||
    (snapshot?.propuesta?.inversion_roles || snapshot?.propuesta?.items || []).length > 0 ||
    (snapshot?.propuesta?.detalle || []).length > 0
  );
}

function snapshotTieneEconomicos(snapshot) {
  const prop = snapshot?.propuesta || {};
  const pagos = prop.pagos_entregables?.length ? prop.pagos_entregables : prop.pagos || [];
  const tienePagosConMonto = pagos.some((p) => num(p.monto) > 0);
  const tieneRecursos = (snapshot?.costos?.recursos || []).some(
    (r) => !r.es_informativo && num(r.costo_final ?? r.costo) > 0
  );
  const tieneInversion =
    num(prop.totales?.total_inversion) > 0 ||
    num(prop.monto_propuesta) > 0 ||
    num(snapshot?.calculados?.monto_propuesta) > 0;
  return tienePagosConMonto || tieneRecursos || tieneInversion;
}

function enriquecerSnapshotDesdeBorrador(versionSnap, borradorSnap) {
  if (!borradorSnap) return versionSnap;
  if (!versionSnap || !snapshotTieneDatos(versionSnap)) return borradorSnap;

  const faltaActividades = !snapshotTieneActividades(versionSnap);
  const faltaEconomicos = !snapshotTieneEconomicos(versionSnap);
  if (!faltaActividades && !faltaEconomicos) return versionSnap;

  return {
    ...versionSnap,
    ...(faltaActividades && borradorSnap.actividades
      ? { actividades: borradorSnap.actividades }
      : {}),
    ...(faltaEconomicos
      ? {
          costos: (borradorSnap.costos?.recursos || []).length
            ? borradorSnap.costos
            : versionSnap.costos,
          propuesta: borradorSnap.propuesta || versionSnap.propuesta,
          calculados: borradorSnap.calculados || versionSnap.calculados
        }
      : {})
  };
}

function actividadesDesdePropuesta(snapshot) {
  const filas = [];
  let n = 0;

  const detalle = snapshot?.propuesta?.detalle || [];
  for (const d of detalle) {
    const actividad = String(d.descripcion || d.actividad || d.item || '').trim();
    if (!actividad) continue;
    n += 1;
    const semanas = num(d.semanas);
    filas.push({
      tipo: 'actividad',
      fase: 'Propuesta económica',
      numero: n,
      actividad,
      semanas: semanas || null,
      dias: semanas > 0 ? round2(semanas * 5) : num(d.dias) || null,
      horas: num(d.horas) || null,
      inversion: num(d.precio_total ?? d.inversion),
      fuente: 'propuesta_detalle'
    });
  }

  const roles = snapshot?.propuesta?.inversion_roles?.length
    ? snapshot.propuesta.inversion_roles
    : snapshot?.propuesta?.items || [];
  if (!filas.length && roles.length) {
    for (const r of roles) {
      const actividad = String(r.actividad || r.rol || '').trim();
      if (!actividad) continue;
      n += 1;
      filas.push({
        tipo: 'actividad',
        fase: 'Inversión por rol',
        numero: n,
        actividad,
        horas: num(r.horas),
        dias: num(r.horas) > 0 ? round2(num(r.horas) / 8) : null,
        inversion: num(r.inversion),
        fuente: 'propuesta_roles'
      });
    }
  }

  const pagos = snapshot?.propuesta?.pagos_entregables?.length
    ? snapshot.propuesta.pagos_entregables
    : snapshot?.propuesta?.pagos || [];
  for (const p of pagos) {
    const desc = String(p.descripcion || p.nombre || '').trim();
    if (!desc) continue;
    filas.push({
      tipo: 'hito',
      fase: 'Pagos / entregables',
      numero: null,
      actividad: desc,
      porcentaje: num(p.porcentaje) ? round2(num(p.porcentaje) * 100) : null,
      monto: num(p.monto),
      fuente: 'propuesta_pagos'
    });
  }

  return filas;
}

function actividadesDesdeCotizacion(snapshot) {
  const act = snapshot?.actividades || {};
  const filas = [];
  let n = 0;
  for (const bloque of act.bloques || []) {
    const fase = String(bloque.nombre || '').trim();
    if (fase) filas.push({ tipo: 'fase', fase, numero: null, actividad: fase });
    for (const a of bloque.actividades || []) {
      n += 1;
      const horas = num(a.horas_efectivas ?? a.horas) + num(a.holgura_horas);
      filas.push({
        tipo: 'actividad',
        fase,
        numero: n,
        actividad: String(a.descripcion || a.nombre || a.paquete_id || '').trim(),
        horas,
        dias: horas > 0 ? round2(horas / 8) : 0,
        fuente: 'cotizacion_actividades'
      });
    }
  }

  const complemento = actividadesDesdePropuesta(snapshot);
  const tieneActividades = filas.some((f) => f.tipo === 'actividad');
  if (!tieneActividades) {
    for (const c of complemento) filas.push(c);
  } else if (complemento.some((c) => c.tipo === 'hito')) {
    filas.push({ tipo: 'fase', fase: 'Pagos / entregables', numero: null, actividad: 'Pagos / entregables' });
    for (const c of complemento.filter((x) => x.tipo === 'hito')) filas.push(c);
  }

  return {
    tipo_estructura: act.tipo_estructura || 'analitica',
    total_horas: num(act.total_horas) || num(snapshot?.calculados?.total_horas),
    filas,
    propuesta_resumen: {
      monto: num(snapshot?.propuesta?.monto_propuesta ?? snapshot?.calculados?.monto_propuesta),
      costo_total: num(snapshot?.calculados?.costo_total),
      margen_pct: num(snapshot?.calculados?.margen_pct)
    }
  };
}

function cronogramaDesdeCotizacion(snapshot) {
  const act = snapshot?.actividades || {};
  const filas = [];
  let n = 0;
  for (const bloque of act.bloques || []) {
    const fase = String(bloque.nombre || '').trim();
    if (fase) filas.push({ tipo: 'fase', fase, numero: null, actividad: fase, dias: null });
    for (const a of bloque.actividades || []) {
      n += 1;
      const horas = num(a.horas_efectivas ?? a.horas) + num(a.holgura_horas);
      const dias = num(a.dias) || (horas > 0 ? round2(horas / 8) : 0);
      filas.push({
        tipo: 'actividad',
        fase,
        numero: n,
        actividad: String(a.descripcion || a.nombre || a.paquete_id || '').trim(),
        dias,
        horas,
        fecha_inicio: a.fecha_inicio || null,
        fecha_fin: a.fecha_fin || null,
        fuente: 'cotizacion_actividades'
      });
    }
  }

  if (!filas.some((f) => f.tipo === 'actividad')) {
    for (const d of snapshot?.propuesta?.detalle || []) {
      const actividad = String(d.descripcion || d.actividad || '').trim();
      if (!actividad) continue;
      n += 1;
      const semanas = num(d.semanas);
      filas.push({
        tipo: 'actividad',
        fase: 'Propuesta',
        numero: n,
        actividad,
        dias: semanas > 0 ? round2(semanas * 5) : num(d.dias) || null,
        semanas: semanas || null,
        fuente: 'propuesta_detalle'
      });
    }
  }

  const totalDias = round2(
    filas.filter((f) => f.tipo === 'actividad').reduce((s, f) => s + num(f.dias), 0)
  );
  const totalHoras = round2(
    filas.filter((f) => f.tipo === 'actividad').reduce((s, f) => s + num(f.horas), 0)
  );
  return {
    filas,
    total_dias: totalDias || (totalHoras > 0 ? round2(totalHoras / 8) : 0),
    total_horas: totalHoras || num(act.total_horas)
  };
}

function hojasCostoDesdeCotizacion(snapshot) {
  const proveedor =
    (snapshot?.costos?.recursos || []).find((r) => !r.es_informativo)?.rol || 'Proveedor';
  const lineas = [];
  for (const bloque of snapshot?.actividades?.bloques || []) {
    const fase = String(bloque.nombre || '').trim();
    if (fase) lineas.push({ actividad: fase, dias: 0, precio: 0, es_fase: true });
    for (const a of bloque.actividades || []) {
      const horas = num(a.horas_efectivas ?? a.horas) + num(a.holgura_horas);
      lineas.push({
        actividad: String(a.descripcion || a.nombre || '').trim(),
        dias: horas > 0 ? round2(horas / 8) : 0,
        precio: 0,
        es_fase: false
      });
    }
  }
  const nombreBase = `Costos ${proveedor}`.trim();
  return [
    { id: 'inicial', nombre: `${nombreBase} inicial`, tipo: 'inicial', proveedor, lineas },
    { id: 'modificado', nombre: `${nombreBase.toUpperCase()} MODIFICADO`, tipo: 'modificado', proveedor, lineas: [] },
    { id: 'final', nombre: `${nombreBase} final`, tipo: 'final', proveedor, lineas: [] }
  ];
}

function calcularLineaFacturacion(line) {
  const cantidad = num(line.cantidad, 1);
  const precio = num(line.precio_unitario);
  const total = round2(cantidad * precio);
  return { ...line, cantidad, precio_unitario: precio, total_venta: total };
}

function calcularLineaCosto(line, ventaReferencia = 0) {
  const cantidad = num(line.cantidad, 1);
  const precio = num(line.precio_unitario);
  const totalCosto = num(line.total_costo) || round2(cantidad * precio);
  const utilidad = num(line.utilidad) || round2(ventaReferencia - totalCosto);
  const base = ventaReferencia > 0 ? ventaReferencia : totalCosto + utilidad;
  const margen = base > 0 ? round2((utilidad / base) * 100) : num(line.margen_pct);
  return {
    ...line,
    cantidad,
    precio_unitario: precio,
    total_costo: totalCosto,
    utilidad,
    margen_pct: margen
  };
}

function calcularReporte(cierre, facturacion, costos, snapshot) {
  const linesF = (facturacion || []).map(calcularLineaFacturacion);
  const igvPct = num(snapshot?.propuesta?.igv_pct ?? snapshot?.costos?.parametros?.igv_pct, 18) / 100;

  const subtotal = round2(linesF.reduce((s, l) => s + num(l.total_venta), 0));
  const igv = round2(
    linesF.filter((l) => l.aplica_igv).reduce((s, l) => s + num(l.total_venta) * igvPct, 0)
  );
  const totalFacturado = round2(subtotal + igv);

  const cotizado =
    num(snapshot?.propuesta?.totales?.total_inversion) ||
    num(snapshot?.propuesta?.totales?.detalle_final) ||
    num(snapshot?.calculados?.precio_final_cliente) ||
    num(snapshot?.calculados?.monto_propuesta);

  const costosReporte = (costos || [])
    .filter((c) => c.fase === 'reporte' || c.fase === 'inicial')
    .map((c, i) => {
      const ventaLinea = num(linesF[i]?.total_venta) || subtotal / Math.max(linesF.length, 1);
      return calcularLineaCosto(c, ventaLinea);
    });
  const costoTotal = round2(costosReporte.reduce((s, c) => s + num(c.total_costo), 0));
  const utilidadTotal = round2(subtotal - costoTotal);
  const margenTotal = subtotal > 0 ? round2((utilidadTotal / subtotal) * 100) : 0;

  const filasEmparejadas = linesF.map((f, i) => ({
    item: f.item_num ?? i + 1,
    facturacion: f,
    costo: costosReporte[i] || null
  }));

  return {
    facturacion: linesF,
    costos: costosReporte,
    filas_emparejadas: filasEmparejadas,
    actividades: actividadesDesdeCotizacion(snapshot),
    cronograma: cronogramaDesdeCotizacion(snapshot),
    cotizacion: {
      codigo: cierre.cotizacion_codigo,
      version: cierre.cotizacion_version_num,
      monto_cotizado: cotizado,
      moneda: cierre.moneda || 'PEN'
    },
    resumen: {
      subtotal_facturacion: subtotal,
      igv_facturacion: igv,
      total_facturado: totalFacturado,
      costo_total: costoTotal,
      utilidad: utilidadTotal,
      margen_pct: margenTotal,
      delta_vs_cotizado: round2(totalFacturado - cotizado),
      delta_pct_vs_cotizado: cotizado > 0 ? round2(((totalFacturado - cotizado) / cotizado) * 100) : 0
    }
  };
}

function cabeceraDesdeCotizacion(cotRow, snapshot, versionNum) {
  const g = snapshot?.general || {};
  const params = snapshot?.costos?.parametros || {};
  const totalHoras = num(snapshot?.actividades?.total_horas);
  const semanas = totalHoras > 0 ? round2(totalHoras / 40) : null;

  return {
    cotizacion_id: cotRow.id,
    cotizacion_version_num: versionNum,
    cotizacion_codigo: cotRow.codigo || g.codigo,
    cliente_nombre: g.cliente || cotRow.cliente,
    ruc: '',
    orden_compra: '',
    forma_pago: params.terminos_pago || 'Crédito 30 días',
    moneda: String(params.moneda || cotRow.moneda || 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN',
    codigo_servicio: '',
    semanas_proyecto: semanas,
    dias_garantia: num(params.horas_garantia ?? params.dias_garantia, 0),
    riesgo: 'medio',
    status_cierre: 'inicial'
  };
}

module.exports = {
  parseJson,
  facturacionDesdeCotizacion,
  costosDesdeCotizacion,
  facturacionVacia,
  monedaDesdeSnapshot,
  montoTotalPropuesta,
  actividadesDesdeCotizacion,
  cronogramaDesdeCotizacion,
  hojasCostoDesdeCotizacion,
  snapshotTieneActividades,
  snapshotTieneDatos,
  snapshotTieneEconomicos,
  enriquecerSnapshotDesdeBorrador,
  calcularReporte,
  cabeceraDesdeCotizacion,
  calcularLineaFacturacion,
  calcularLineaCosto,
  round2,
  num
};
