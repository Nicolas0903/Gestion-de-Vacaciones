export const TIPOS_PROYECTO_CATALOGO = [
  { codigo: '7001', nombre: 'LICENCIAS - VENTA', estructura: 'analitica' },
  { codigo: '7001A', nombre: 'ACTIVACION DE LICENCIAS', estructura: 'analitica' },
  { codigo: '7001B', nombre: 'LICENCIAS POWER BI', estructura: 'analitica' },
  { codigo: '7001C', nombre: 'LICENCIAS SNOWFLAKE', estructura: 'analitica' },
  { codigo: '7002', nombre: 'CONSULTORIA', estructura: 'analitica' },
  { codigo: '7003', nombre: 'CAPACITACION', estructura: 'analitica' },
  { codigo: '7004', nombre: 'SOPORTE Y MANTENIMIENTO', estructura: 'bolsa_horas' },
  { codigo: '7008', nombre: 'OTROS', estructura: 'analitica' }
];

export const ESTRUCTURA_LABEL = {
  analitica: 'Analítica (módulos)',
  desarrollo: 'Desarrollo (fases)',
  bolsa_horas: 'Bolsa de horas'
};

function normalizarCodigoTipo(c) {
  return String(c || '')
    .trim()
    .toUpperCase();
}

function normalizarNombreTipo(n) {
  return String(n || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function buscarTipoProyecto({ codigo, nombre } = {}) {
  const c = normalizarCodigoTipo(codigo);
  if (c) {
    const hit = TIPOS_PROYECTO_CATALOGO.find((t) => normalizarCodigoTipo(t.codigo) === c);
    if (hit) return hit;
  }
  const s = normalizarNombreTipo(nombre);
  if (s) {
    return TIPOS_PROYECTO_CATALOGO.find((t) => normalizarNombreTipo(t.nombre) === s) || null;
  }
  return null;
}

/** Resuelve código SAP interno (no mostrar en UI). */
export function parcheGeneralTipoProyecto(codigo) {
  const hit = buscarTipoProyecto({ codigo });
  if (!hit) return { tipo_proyecto_codigo: codigo || '', tipo_proyecto: '' };
  return { tipo_proyecto_codigo: hit.codigo, tipo_proyecto: hit.nombre };
}

/** Selector y listados: solo descripción visible. */
export function parcheGeneralTipoProyectoDesdeNombre(nombre) {
  const hit = buscarTipoProyecto({ nombre });
  if (!hit) return { tipo_proyecto: String(nombre || '').trim(), tipo_proyecto_codigo: '' };
  return { tipo_proyecto_codigo: hit.codigo, tipo_proyecto: hit.nombre };
}

export function nombreVisibleTipoProyecto(codigo, nombre) {
  const hit = buscarTipoProyecto({ codigo, nombre });
  return hit?.nombre || String(nombre || '').trim();
}

export function estructuraDesdeTipoProyecto(nombreOCodigo) {
  const hit = buscarTipoProyecto({ codigo: nombreOCodigo, nombre: nombreOCodigo });
  if (hit) return hit.estructura;

  const s = normalizarNombreTipo(nombreOCodigo);
  if (!s) return 'analitica';

  if (s.includes('BOLSA') || s.includes('SOPORTE') || s.includes('MANTENIMIENTO')) return 'bolsa_horas';
  if (s.includes('DESARROLLO')) return 'desarrollo';
  return 'analitica';
}

export function labelDesdeEstructura(estructura) {
  return ESTRUCTURA_LABEL[estructura] || ESTRUCTURA_LABEL.analitica;
}

export const tiposProyectoOpciones = () =>
  TIPOS_PROYECTO_CATALOGO.map((t, i) => ({
    id: i + 1,
    codigo: t.codigo,
    nombre: t.nombre
  }));

export function actividadesConTipoProyecto(actividades, tipoProyecto) {
  const tipo_estructura = estructuraDesdeTipoProyecto(tipoProyecto);
  const next = { ...(actividades || {}), tipo_estructura };
  const bloques = next.bloques || [];

  if (tipo_estructura === 'bolsa_horas' && bloques.length === 0) {
    next.bloques = [
      {
        id: `${Date.now()}-bolsa`,
        nombre: 'Bolsa de horas',
        orden: 1,
        actividades: []
      }
    ];
  }
  return next;
}

/** Sincroniza recursos de costos desde perfiles de actividades (rol + horas). */
export function costosConRecursosDesdePerfiles(actividades, costos) {
  const perfiles = actividades?.perfiles || [];
  const recursos = [...(costos?.recursos || [])];
  const idsPerfilActivos = new Set();

  for (const p of perfiles) {
    const nombre = String(p.perfil || '').trim();
    if (!nombre || !p.id) continue;
    idsPerfilActivos.add(p.id);
    const horas = Number(p.horas) || 0;

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
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

  const recursosFiltrados = recursos.filter(
    (r) => r.perfil_actividad_id && idsPerfilActivos.has(r.perfil_actividad_id)
  );

  recursosFiltrados.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return { ...(costos || {}), recursos: recursosFiltrados };
}

export function borradorConSyncPerfilesCostos(borrador) {
  if (!borrador) return borrador;
  const actividades = borrador.actividades;
  const costos = costosConRecursosDesdePerfiles(actividades, borrador.costos);
  return { ...borrador, costos };
}
