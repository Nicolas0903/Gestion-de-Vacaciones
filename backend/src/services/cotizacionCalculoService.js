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

function resolverIndicesGarantia(p) {
  if (Array.isArray(p?.recursos_garantia_idx) && p.recursos_garantia_idx.length) {
    return [...new Set(p.recursos_garantia_idx.map((x) => num(x)).filter((n) => n >= 0))];
  }
  return [Math.max(0, num(p?.recurso_garantia_idx, 0))];
}

function tarifaGarantiaReferencia(recursos, indices, horasMes) {
  const hm = num(horasMes, DEFAULT_HORAS_MES) || DEFAULT_HORAS_MES;
  const rates = indices
    .map((i) => recursos[i])
    .filter(Boolean)
    .map((r) => {
      const ch = num(r.costo_hora);
      if (ch > 0) return round2(ch);
      return hm > 0 ? round2(num(r.salario) / hm) : 0;
    })
    .filter((t) => t > 0);
  if (!rates.length) return 0;
  return round2(rates.reduce((a, b) => a + b, 0));
}

/** Excel: tarifa (suma costo/h de recursos elegidos, o manual) × horas garantía. */
function calcularGarantia(parametros, recursos) {
  const horas = num(parametros.horas_garantia);
  if (horas <= 0) {
    return { tarifa: 0, horas: 0, costo_directo: 0, monto: 0 };
  }
  const modo = String(parametros.garantia_modo || 'recursos').toLowerCase();
  let tarifa = NaN;
  if (modo === 'manual') {
    tarifa = num(parametros.tarifa_garantia, NaN);
  } else {
    const indices = resolverIndicesGarantia(parametros);
    tarifa = tarifaGarantiaReferencia(recursos, indices, parametros.horas_mes);
    if (!Number.isFinite(tarifa) || tarifa <= 0) {
      tarifa = num(parametros.tarifa_garantia, NaN);
    }
  }
  if (!Number.isFinite(tarifa)) {
    tarifa = 0;
  }
  tarifa = round2(tarifa);
  const costo_directo = round2(tarifa * horas);
  return { tarifa, horas, costo_directo, monto: costo_directo };
}

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
    impuesto_tipo: ['igv', 'renta', 'otros'].includes(String(p.impuesto_tipo || 'igv').toLowerCase())
      ? String(p.impuesto_tipo || 'igv').toLowerCase()
      : 'igv',
    impuesto_pct:
      p.impuesto_pct != null && p.impuesto_pct !== ''
        ? num(p.impuesto_pct)
        : num(p.igv_pct, DEFAULT_IGV),
    impuesto_monto:
      p.impuesto_monto != null && p.impuesto_monto !== '' ? round2(num(p.impuesto_monto)) : null,
    impuesto_otros_etiqueta: String(p.impuesto_otros_etiqueta || '').trim(),
    total_general_manual:
      p.total_general_manual != null && p.total_general_manual !== ''
        ? round2(num(p.total_general_manual))
        : null,
    comision_admin_pct: num(p.comision_admin_pct, 10),
    horas_garantia: horasGarantia,
    recursos_garantia_idx: resolverIndicesGarantia(p),
    recurso_garantia_idx: resolverIndicesGarantia(p)[0] ?? 0,
    tarifa_garantia:
      p.tarifa_garantia != null && p.tarifa_garantia !== ''
        ? round2(num(p.tarifa_garantia))
        : null,
    texto_garantia: String(p.texto_garantia || '').trim(),
    garantia_modo: String(p.garantia_modo || 'recursos').toLowerCase() === 'manual' ? 'manual' : 'recursos',
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

  const garantiaDet = calcularGarantia(parametros, recursos);
  const garantia = garantiaDet.monto;

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
  const proyeccion_auto = proyecciones[parametros.proyeccion_activa] ?? proyecciones[0] ?? 0;
  const total_general =
    parametros.total_general_manual != null ? parametros.total_general_manual : round2(proyeccion_auto);
  const impTipo = parametros.impuesto_tipo;
  const impPct = parametros.impuesto_pct;
  let impuesto_etiqueta = 'IGV';
  if (impTipo === 'renta') impuesto_etiqueta = 'Imp. a la renta';
  if (impTipo === 'otros') {
    impuesto_etiqueta = parametros.impuesto_otros_etiqueta || 'Otros impuestos';
  }
  const impuesto_aplica = parametros.impuesto_aplica !== false;
  let impuesto_auto = 0;
  if (impuesto_aplica && (impTipo === 'igv' || impTipo === 'renta')) {
    impuesto_auto = round2(total_general * (impPct / 100));
  }
  const impuesto_monto =
    parametros.impuesto_monto != null ? parametros.impuesto_monto : impuesto_auto;
  const proyeccion_seleccionada = total_general;
  const igv_proyeccion = impuesto_monto;
  const precio_final_cliente = round2(total_general + impuesto_monto);
  const margen_pct =
    total_general > 0
      ? round2(((total_general - costo_base_proyeccion) / total_general) * 100)
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
      garantia_tarifa: garantiaDet.tarifa,
      garantia_horas: garantiaDet.horas,
      garantia_costo_directo: garantiaDet.costo_directo,
      comision,
      costo_total,
      costo_total_usd: costo_en_usd,
      costo_total_pen: costo_en_pen,
      proyecciones,
      proyecciones_usd,
      proyecciones_pen,
      costo_base_proyeccion,
      proyeccion_auto,
      proyeccion_seleccionada,
      total_general,
      impuesto_tipo: impTipo,
      impuesto_etiqueta,
      impuesto_pct: impPct,
      impuesto_monto,
      impuesto_monto_auto: impuesto_auto,
      igv_proyeccion,
      precio_final_cliente,
      margen_pct,
      igv_monto,
      costo_total_con_igv
    }
  };
}

const PROPIEDADES_PROPUESTA_META = [
  'moneda_facturacion',
  'limite_total_final',
  'cierre_propuesta',
  'cierre_propuesta_at',
  'cierre_propuesta_nota',
  'cierre_comercial_estado',
  'cierre_comercial_cerrado_at',
  'cierre_comercial_cerrado_por'
];

function metaPropuestaDesdeRaw(propuestaRaw, costosParametros) {
  const meta = {};
  const monedaRaw =
    propuestaRaw?.moneda_facturacion ?? propuestaRaw?.moneda ?? costosParametros?.moneda ?? 'PEN';
  meta.moneda_facturacion = String(monedaRaw).toUpperCase() === 'USD' ? 'USD' : 'PEN';
  const raw = propuestaRaw || {};
  for (const k of PROPIEDADES_PROPUESTA_META) {
    if (k === 'moneda_facturacion') continue;
    if (Object.prototype.hasOwnProperty.call(raw, k)) meta[k] = raw[k];
  }
  return meta;
}

function calcularPropuesta(propuestaRaw, costosResumen, costosParametros) {
  const meta = metaPropuestaDesdeRaw(propuestaRaw, costosParametros);
  const impuestoAplica =
    propuestaRaw?.igv_aplica !== false && costosParametros?.impuesto_aplica !== false;
  const igvPctNum = impuestoAplica
    ? num(propuestaRaw?.igv_pct ?? costosParametros?.impuesto_pct ?? costosResumen?.igv_pct ?? DEFAULT_IGV)
    : 0;
  const igvPct = igvPctNum / 100;

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

  const filasFormaPago =
    propuestaRaw?.pagos_forma?.length > 0
      ? propuestaRaw.pagos_forma
      : propuestaRaw?.pagos_entregables?.length
        ? propuestaRaw.pagos_entregables
        : propuestaRaw?.pagos || [];

  const detalle = (propuestaRaw?.detalle || []).map((d, idx) => {
    let precio = num(d.precio);
    const role = inversion_roles[idx];
    if (role) {
      const inv = num(role.inversion);
      const tot = num(role.total);
      if (precio > 0 && tot > 0 && inv > 0 && Math.abs(precio - tot) < 0.02 && Math.abs(precio - inv) > 0.02) {
        precio = inv;
      }
    }
    return {
      ...d,
      orden: idx + 1,
      actividad: String(d.actividad || '').trim(),
      horas: num(d.horas ?? d.semanas),
      precio
    };
  });

  const detalle_total = round2(detalle.reduce((s, d) => s + num(d.precio), 0));
  const detalle_igv = round2(detalle_total * igvPct);
  const detalle_final = round2(detalle_total + detalle_igv);

  const pagos_forma = filasFormaPago.map((p, idx) => {
    const porcentaje = num(p.porcentaje);
    return {
      ...p,
      orden: idx + 1,
      porcentaje,
      monto: round2(total_inversion * porcentaje)
    };
  });

  const monto_propuesta =
    total_inversion > 0 ? total_inversion : detalle_final > 0 ? detalle_final : costosResumen.costo_total_con_igv;

  return {
    ...meta,
    igv_pct: igvPctNum,
    inversion_roles,
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
    estado: ['borrador', 'en_revision', 'aprobada', 'enviada', 'ganada', 'perdida'].includes(generalNorm?.estado)
      ? generalNorm.estado
      : 'borrador',
    nombre_proyecto: String(generalNorm?.nombre_proyecto || generalNorm?.proyecto || '').trim(),
    cliente: String(generalNorm?.cliente || '').trim(),
    ruc_cliente: String(generalNorm?.ruc_cliente || '')
      .trim()
      .replace(/[^\d-]/g, ''),
    tipo_proyecto_codigo: String(generalNorm?.tipo_proyecto_codigo || '').trim(),
    tipo_proyecto: String(generalNorm?.tipo_proyecto || '').trim(),
    responsable_ids: resp.responsable_ids,
    responsable_id: resp.responsable_id,
    notas_internas: String(generalNorm?.notas_internas || '').trim()
  };

  const actividades = calcularActividades(data?.actividades || {});
  const costosInput = syncCostosRecursosDesdePerfiles(actividades, data?.costos || {});
  const costos = calcularCostos(costosInput);
  const propuesta = calcularPropuesta(data?.propuesta || {}, costos.resumen, costos.parametros);
  costos.parametros = { ...costos.parametros, moneda: propuesta.moneda_facturacion };

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
      ruc_cliente: '',
      notas_internas: '',
      fecha_subida: '',
      fecha_deadline_propuesta: '',
      comercial_solicitante: ''
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
        impuesto_aplica: true,
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
      moneda_facturacion: 'PEN',
      cierre_propuesta: null,
      cierre_propuesta_at: null,
      cierre_propuesta_nota: '',
      cierre_comercial_estado: 'borrador',
      cierre_comercial_cerrado_at: null,
      cierre_comercial_cerrado_por: null,
      inversion_roles: [
        { cantidad: 1, actividad: 'Jefe Proyecto', inversion: 0 },
        { cantidad: 1, actividad: 'Consultor Senior Power BI', inversion: 0 },
        { cantidad: 1, actividad: 'Consultor Integración Datos Fabric', inversion: 0 }
      ],
      detalle: [{ actividad: '', horas: 0, precio: null }],
      pagos_forma: [
        { descripcion: 'Pago 1 - Al inicio del proyecto', porcentaje: 0.4 },
        { descripcion: 'Pago 2 - Entregable Final', porcentaje: 0.6 }
      ]
    }
  };
}

function limiteTotalFinalPropuesta(propuesta) {
  let lim = num(propuesta?.limite_total_final);
  if (lim <= 0) lim = num(propuesta?.totales?.total_inversion);
  return lim;
}

function totalFinalPropuestaParaTope(propuesta) {
  const tInv = num(propuesta?.totales?.total_inversion);
  const tDet = num(propuesta?.totales?.detalle_final);
  return Math.max(tInv, tDet);
}

function validarPropuestaComercialNoSuperaLimite(propuesta) {
  const limite = limiteTotalFinalPropuesta(propuesta);
  if (limite <= 0) {
    throw new Error(
      'Aún no hay monto tope: el equipo de elaboración debe guardar la propuesta antes de que comercial ajuste cuadros.'
    );
  }
  const total = totalFinalPropuestaParaTope(propuesta);
  if (total > limite + 0.02) {
    throw new Error(
      `El total final (${total}) supera el límite autorizado (${limite}). Reduce montos o reparte pagos dentro del tope.`
    );
  }
  return true;
}

function aplicarLimiteDesdeElaboracion(propuesta) {
  const total = num(propuesta?.totales?.total_inversion);
  if (total > 0) {
    return { ...propuesta, limite_total_final: total };
  }
  return propuesta;
}

module.exports = {
  calcularCotizacion,
  borradorVacio,
  uid,
  TIPOS_ESTRUCTURA,
  DEFAULT_HORAS_MES,
  DEFAULT_IGV,
  DEFAULT_MARKUPS,
  limiteTotalFinalPropuesta,
  totalFinalPropuestaParaTope,
  validarPropuestaComercialNoSuperaLimite,
  aplicarLimiteDesdeElaboracion
};
