const DEFAULT_HORAS_MES = 160;
const DEFAULT_IGV = 18;

const TIPOS_ESTRUCTURA = ['analitica', 'desarrollo', 'bolsa_horas'];

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function round2(n) {
  return Math.round(num(n) * 100) / 100;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Costo por recurso: (salario/horas_mes) × horas × cantidad × sobrecosto */
function calcularRecurso(r, horasMes) {
  const salario = num(r.salario);
  const cantidad = num(r.cantidad, 1);
  const horas = num(r.horas_asignadas ?? r.horas ?? r.tiempo_meses);
  const sobrecosto = num(r.sobrecosto, 1) || 1;
  const hm = num(horasMes, DEFAULT_HORAS_MES) || DEFAULT_HORAS_MES;
  const costo_hora = hm > 0 ? round2(salario / hm) : 0;
  const costo_directo = round2(costo_hora * horas * cantidad);
  const costo_final = round2(costo_directo * sobrecosto);
  return {
    ...r,
    horas_asignadas: horas,
    costo_hora,
    costo_directo,
    costo: costo_final,
    costo_final
  };
}

function calcularActividadFila(a, idx) {
  const horas = num(a.horas);
  const holgura_horas = num(a.holgura_horas);
  const horas_efectivas = round2(horas + holgura_horas);
  return {
    ...a,
    orden: num(a.orden, idx + 1),
    horas,
    holgura_horas,
    horas_efectivas
  };
}

function calcularBloque(bloque) {
  const actividades = (bloque.actividades || []).map(calcularActividadFila);
  const total_horas = round2(actividades.reduce((s, a) => s + num(a.horas_efectivas), 0));
  const total_horas_base = round2(actividades.reduce((s, a) => s + num(a.horas), 0));
  const total_holgura = round2(actividades.reduce((s, a) => s + num(a.holgura_horas), 0));
  return { ...bloque, actividades, total_horas, total_horas_base, total_holgura };
}

function calcularActividades(actividadesRaw) {
  const tipo_estructura = TIPOS_ESTRUCTURA.includes(actividadesRaw?.tipo_estructura)
    ? actividadesRaw.tipo_estructura
    : 'analitica';

  let bloques = (actividadesRaw?.bloques || []).map(calcularBloque);

  if (tipo_estructura === 'bolsa_horas' && bloques.length === 0 && (actividadesRaw?.items || []).length) {
    bloques = [
      calcularBloque({
        id: 'bolsa-unica',
        nombre: 'Bolsa de horas',
        orden: 1,
        actividades: actividadesRaw.items
      })
    ];
  }

  const horas_actividades = round2(bloques.reduce((s, b) => s + num(b.total_horas_base), 0));
  const holgura_horas = round2(bloques.reduce((s, b) => s + num(b.total_holgura), 0));
  const total_horas = round2(bloques.reduce((s, b) => s + num(b.total_horas), 0));

  const perfilesRaw = (actividadesRaw?.perfiles || []).map((p, idx) => ({
    ...p,
    id: p.id || uid(),
    orden: num(p.orden, idx + 1),
    perfil: String(p.perfil || p.nombre || '').trim(),
    horas: num(p.horas)
  }));
  const totalHorasPerfilesRaw = perfilesRaw.reduce((s, p) => s + num(p.horas), 0);
  let pctAcum = 0;
  const perfiles = perfilesRaw.map((p, idx) => {
    let participacion_pct = 0;
    if (totalHorasPerfilesRaw > 0) {
      if (idx === perfilesRaw.length - 1) {
        participacion_pct = round2(100 - pctAcum);
      } else {
        participacion_pct = round2((num(p.horas) / totalHorasPerfilesRaw) * 100);
        pctAcum += participacion_pct;
      }
    }
    return { ...p, participacion_pct };
  });
  const total_horas_perfiles = round2(perfiles.reduce((s, p) => s + num(p.horas), 0));
  const total_participacion_pct = round2(
    perfiles.reduce((s, p) => s + num(p.participacion_pct), 0)
  );

  return {
    tipo_estructura,
    bloques,
    perfiles,
    total_horas_perfiles,
    total_participacion_pct,
    horas_actividades,
    holgura_horas,
    total_horas,
    total_bloques: bloques.length
  };
}

function syncCostosRecursosDesdePerfiles(actividades, costosRaw) {
  const perfiles = actividades?.perfiles || [];
  const recursos = [...(costosRaw?.recursos || [])];
  const idsPerfilActivos = new Set();

  for (const p of perfiles) {
    const nombre = String(p.perfil || '').trim();
    if (!nombre || !p.id) continue;
    idsPerfilActivos.add(p.id);
    const horas = num(p.horas);

    let idx = recursos.findIndex((r) => r.perfil_actividad_id === p.id);
    if (idx < 0) {
      idx = recursos.findIndex(
        (r) =>
          !r.perfil_actividad_id &&
          String(r.rol || '')
            .trim()
            .toLowerCase() === nombre.toLowerCase()
      );
    }

    if (idx >= 0) {
      recursos[idx] = {
        ...recursos[idx],
        rol: nombre,
        horas_asignadas: horas,
        perfil_actividad_id: p.id
      };
    } else {
      recursos.push({
        id: uid(),
        rol: nombre,
        cantidad: 1,
        salario: 0,
        horas_asignadas: horas,
        sobrecosto: 1,
        es_informativo: false,
        perfil_actividad_id: p.id,
        orden: recursos.length + 1
      });
    }
  }

  const recursosFiltrados = recursos
    .filter((r) => r.perfil_actividad_id && idsPerfilActivos.has(r.perfil_actividad_id))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return { ...(costosRaw || {}), recursos: recursosFiltrados };
}

const { normalizarGeneralTipoProyecto } = require('../constants/cotizacionTiposProyecto');

const DEFAULT_MARKUPS = [1.9, 1.6, 1.7, 1.43];

function calcularCostos(costosRaw) {
  const p = costosRaw?.parametros || {};
  const markupsRaw = Array.isArray(p.markups) && p.markups.length ? p.markups : DEFAULT_MARKUPS;
  const markups = markupsRaw.map((m) => num(m, 1) || 1).slice(0, 4);
  while (markups.length < 4) markups.push(DEFAULT_MARKUPS[markups.length] || 1);

  const horasGarantia =
    p.horas_garantia != null ? num(p.horas_garantia) : num(p.dias_garantia, 0);

  const monedaRecursos =
    String(p.moneda_recursos || p.moneda_costos || 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN';

  const parametros = {
    moneda: String(p.moneda || 'USD').toUpperCase() === 'PEN' ? 'PEN' : 'USD',
    moneda_recursos: monedaRecursos,
    moneda_proyeccion: String(p.moneda_proyeccion || 'USD').toUpperCase() === 'PEN' ? 'PEN' : 'USD',
    tipo_cambio: num(p.tipo_cambio, 3.4) || 3.4,
    horas_mes: num(p.horas_mes, DEFAULT_HORAS_MES) || DEFAULT_HORAS_MES,
    igv_pct: num(p.igv_pct, DEFAULT_IGV),
    comision_admin_pct: num(p.comision_admin_pct, 10),
    horas_garantia: horasGarantia,
    recurso_garantia_idx: num(p.recurso_garantia_idx, 0),
    markups,
    proyeccion_activa: Math.min(Math.max(num(p.proyeccion_activa, 0), 0), markups.length - 1),
    terminos_pago: String(p.terminos_pago || ''),
    notas_costos: String(p.notas_costos || '')
  };

  const recursos = (costosRaw?.recursos || []).map((r) => calcularRecurso(r, parametros.horas_mes));
  const participantes = recursos.filter((r) => !r.es_informativo);
  const informativos = recursos.filter((r) => r.es_informativo);

  const subtotal_recursos = round2(participantes.reduce((s, r) => s + num(r.costo_final ?? r.costo), 0));
  const total_informativos = round2(informativos.reduce((s, r) => s + num(r.costo_final ?? r.costo), 0));

  const refRecurso = recursos[parametros.recurso_garantia_idx];
  const garantia =
    refRecurso && parametros.horas_garantia > 0
      ? round2((num(refRecurso.salario) / parametros.horas_mes) * parametros.horas_garantia)
      : 0;

  const comision = round2(subtotal_recursos * (parametros.comision_admin_pct / 100));
  const costo_total = round2(subtotal_recursos + garantia + comision);
  const tc = parametros.tipo_cambio > 0 ? parametros.tipo_cambio : 1;
  const costo_en_pen =
    parametros.moneda_recursos === 'PEN' ? costo_total : round2(costo_total * tc);
  const costo_en_usd =
    parametros.moneda_recursos === 'USD' ? costo_total : round2(costo_total / tc);

  const proyecciones_usd = markups.map((m) => round2(costo_en_usd * m));
  const proyecciones_pen = markups.map((m) => round2(costo_en_pen * m));
  const proyecciones =
    parametros.moneda_proyeccion === 'PEN' ? proyecciones_pen : proyecciones_usd;
  const costo_base_proyeccion =
    parametros.moneda_proyeccion === 'PEN' ? costo_en_pen : costo_en_usd;
  const proyeccion_seleccionada = proyecciones[parametros.proyeccion_activa] ?? proyecciones[0] ?? 0;
  const igv_proyeccion = round2(proyeccion_seleccionada * (parametros.igv_pct / 100));
  const precio_final_cliente = round2(proyeccion_seleccionada + igv_proyeccion);
  const margen_pct =
    proyeccion_seleccionada > 0
      ? round2(((proyeccion_seleccionada - costo_base_proyeccion) / proyeccion_seleccionada) * 100)
      : 0;

  const igv_monto = round2(costo_total * (parametros.igv_pct / 100));
  const costo_total_con_igv = round2(costo_total + igv_monto);

  return {
    recursos,
    parametros,
    resumen: {
      subtotal_recursos,
      base_participantes: subtotal_recursos,
      total_informativos,
      garantia,
      comision,
      costo_total,
      costo_total_usd: costo_en_usd,
      costo_total_pen: costo_en_pen,
      proyecciones,
      proyecciones_usd,
      proyecciones_pen,
      costo_base_proyeccion,
      proyeccion_seleccionada,
      igv_proyeccion,
      precio_final_cliente,
      margen_pct,
      igv_monto,
      costo_total_con_igv
    }
  };
}

function calcularPropuesta(propuestaRaw, costosResumen) {
  const igvPct = num(propuestaRaw?.igv_pct ?? costosResumen?.igv_pct ?? DEFAULT_IGV) / 100;

  const inversion_roles = (
    propuestaRaw?.inversion_roles?.length
      ? propuestaRaw.inversion_roles
      : propuestaRaw?.items || []
  ).map((item, idx) => {
    const inversion = num(item.inversion);
    const igv = round2(inversion * igvPct);
    return {
      ...item,
      orden: idx + 1,
      cantidad: num(item.cantidad, 1),
      actividad: String(item.actividad || item.rol || '').trim(),
      inversion,
      igv,
      total: round2(inversion + igv)
    };
  });

  const inversion_total = round2(inversion_roles.reduce((s, i) => s + num(i.inversion), 0));
  const igv_inversion = round2(inversion_roles.reduce((s, i) => s + num(i.igv), 0));
  const total_inversion = round2(inversion_roles.reduce((s, i) => s + num(i.total), 0));

  const pagos_entregables = (propuestaRaw?.pagos_entregables?.length
    ? propuestaRaw.pagos_entregables
    : propuestaRaw?.pagos || []
  ).map((p, idx) => {
    const porcentaje = num(p.porcentaje);
    return {
      ...p,
      orden: idx + 1,
      porcentaje,
      monto: round2(total_inversion * porcentaje)
    };
  });

  const detalle = (propuestaRaw?.detalle || []).map((d, idx) => ({
    ...d,
    orden: idx + 1,
    actividad: String(d.actividad || '').trim(),
    horas: num(d.horas ?? d.semanas),
    precio: num(d.precio)
  }));

  const detalle_total = round2(detalle.reduce((s, d) => s + num(d.precio), 0));
  const detalle_igv = round2(detalle_total * igvPct);
  const detalle_final = round2(detalle_total + detalle_igv);

  const pagos_forma = (propuestaRaw?.pagos_forma || []).map((p, idx) => {
    const porcentaje = num(p.porcentaje);
    const base = detalle_final > 0 ? detalle_final : total_inversion;
    return {
      ...p,
      orden: idx + 1,
      porcentaje,
      monto: round2(base * porcentaje)
    };
  });

  const monto_propuesta =
    total_inversion > 0 ? total_inversion : detalle_final > 0 ? detalle_final : costosResumen.costo_total_con_igv;

  return {
    igv_pct: igvPct * 100,
    inversion_roles,
    pagos_entregables,
    detalle,
    pagos_forma,
    totales: {
      inversion_total,
      igv_inversion,
      total_inversion,
      detalle_total,
      detalle_igv,
      detalle_final
    },
    monto_propuesta
  };
}

function normalizarResponsableIds(general) {
  let ids = [];
  if (Array.isArray(general?.responsable_ids)) {
    ids = general.responsable_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  } else if (general?.responsable_id != null) {
    const n = Number(general.responsable_id);
    if (Number.isFinite(n) && n > 0) ids = [n];
  }
  const uniq = [...new Set(ids)];
  return { responsable_ids: uniq, responsable_id: uniq[0] ?? null };
}

function calcularCotizacion(data) {
  const generalNorm = normalizarGeneralTipoProyecto(data?.general || {});
  const resp = normalizarResponsableIds(generalNorm);
  const general = {
    codigo: String(generalNorm?.codigo || '').trim(),
    estado: ['borrador', 'en_revision', 'enviada', 'ganada', 'perdida'].includes(generalNorm?.estado)
      ? generalNorm.estado
      : 'borrador',
    nombre_proyecto: String(generalNorm?.nombre_proyecto || generalNorm?.proyecto || '').trim(),
    cliente: String(generalNorm?.cliente || '').trim(),
    tipo_proyecto_codigo: String(generalNorm?.tipo_proyecto_codigo || '').trim(),
    tipo_proyecto: String(generalNorm?.tipo_proyecto || '').trim(),
    responsable_ids: resp.responsable_ids,
    responsable_id: resp.responsable_id,
    notas_internas: String(generalNorm?.notas_internas || '').trim()
  };

  const actividades = calcularActividades(data?.actividades || {});
  const costosInput = syncCostosRecursosDesdePerfiles(actividades, data?.costos || {});
  const costos = calcularCostos(costosInput);
  const propuesta = calcularPropuesta(data?.propuesta || {}, costos.resumen);

  const calculados = {
    total_horas: actividades.total_horas,
    ...costos.resumen,
    monto_propuesta: propuesta.monto_propuesta
  };

  return {
    general,
    actividades,
    costos,
    propuesta,
    calculados
  };
}

function borradorVacio() {
  return {
    general: {
      codigo: '',
      estado: 'borrador',
      nombre_proyecto: '',
      cliente: '',
      tipo_proyecto_codigo: '',
      tipo_proyecto: '',
      responsable_ids: [],
      responsable_id: null,
      notas_internas: ''
    },
    actividades: {
      tipo_estructura: 'analitica',
      bloques: [],
      perfiles: []
    },
    costos: {
      recursos: [],
      parametros: {
        moneda: 'USD',
        moneda_recursos: 'PEN',
        moneda_proyeccion: 'USD',
        tipo_cambio: 3.4,
        horas_mes: DEFAULT_HORAS_MES,
        igv_pct: DEFAULT_IGV,
        comision_admin_pct: 10,
        horas_garantia: 20,
        recurso_garantia_idx: 0,
        markups: [...DEFAULT_MARKUPS],
        proyeccion_activa: 0,
        terminos_pago: '',
        notas_costos: ''
      }
    },
    propuesta: {
      igv_pct: DEFAULT_IGV,
      inversion_roles: [
        { cantidad: 1, actividad: 'Jefe Proyecto', inversion: 0 },
        { cantidad: 1, actividad: 'Consultor Senior Power BI', inversion: 0 },
        { cantidad: 1, actividad: 'Consultor Integración Datos Fabric', inversion: 0 }
      ],
      pagos_entregables: [
        { descripcion: 'Pago 1 - Al inicio del proyecto', porcentaje: 0.25 },
        { descripcion: 'Pago 2 - Entregable 2', porcentaje: 0.25 },
        { descripcion: 'Pago 3 - Entregable 3', porcentaje: 0.25 },
        { descripcion: 'Pago 4 - Entregable 4', porcentaje: 0.25 }
      ],
      detalle: [{ actividad: 'Construcción de la solución analítica', horas: 0, precio: 0 }],
      pagos_forma: [
        { descripcion: 'Pago 1 - Pago Inicial', porcentaje: 0.3 },
        { descripcion: 'Pago 2 - Entregable 1 y 2', porcentaje: 0.3 },
        { descripcion: 'Pago 3 - Entregable 3', porcentaje: 0.2 },
        { descripcion: 'Pago 4 - Al finalizar el proyecto', porcentaje: 0.2 }
      ]
    }
  };
}

module.exports = {
  calcularCotizacion,
  borradorVacio,
  uid,
  TIPOS_ESTRUCTURA,
  DEFAULT_HORAS_MES,
  DEFAULT_IGV,
  DEFAULT_MARKUPS
};
