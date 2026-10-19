/** Catálogo tipo de proyecto (código SAP + descripción). Enlazable con cierre de negocio. */
const TIPOS_PROYECTO_CATALOGO = [
  { codigo: '7001', nombre: 'LICENCIAS - VENTA', estructura: 'analitica' },
  { codigo: '7001A', nombre: 'ACTIVACION DE LICENCIAS', estructura: 'analitica' },
  { codigo: '7001B', nombre: 'LICENCIAS POWER BI', estructura: 'analitica' },
  { codigo: '7001C', nombre: 'LICENCIAS SNOWFLAKE', estructura: 'analitica' },
  { codigo: '7002', nombre: 'CONSULTORIA', estructura: 'analitica' },
  { codigo: '7003', nombre: 'CAPACITACION', estructura: 'analitica' },
  { codigo: '7004', nombre: 'SOPORTE Y MANTENIMIENTO', estructura: 'bolsa_horas' },
  { codigo: '7008', nombre: 'OTROS', estructura: 'analitica' }
];

const ESTRUCTURA_LABEL = {
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

function buscarTipoProyecto({ codigo, nombre } = {}) {
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

function normalizarGeneralTipoProyecto(general) {
  const g = general || {};
  const hit =
    buscarTipoProyecto({ codigo: g.tipo_proyecto_codigo, nombre: g.tipo_proyecto }) ||
    buscarTipoProyecto({ codigo: g.tipo_proyecto, nombre: g.tipo_proyecto });
  if (!hit) return g;
  return {
    ...g,
    tipo_proyecto_codigo: hit.codigo,
    tipo_proyecto: hit.nombre
  };
}

function estructuraDesdeTipoProyecto(nombreOCodigo) {
  const hit = buscarTipoProyecto({ codigo: nombreOCodigo, nombre: nombreOCodigo });
  if (hit) return hit.estructura;

  const s = normalizarNombreTipo(nombreOCodigo);
  if (!s) return 'analitica';

  if (s.includes('BOLSA') || s.includes('SOPORTE') || s.includes('MANTENIMIENTO')) return 'bolsa_horas';
  if (s.includes('DESARROLLO')) return 'desarrollo';
  return 'analitica';
}

function labelDesdeEstructura(estructura) {
  return ESTRUCTURA_LABEL[estructura] || ESTRUCTURA_LABEL.analitica;
}

function listarTiposProyectoCatalogo() {
  return TIPOS_PROYECTO_CATALOGO.map((t, i) => ({
    id: i + 1,
    codigo: t.codigo,
    nombre: t.nombre
  }));
}

function tipoProyectoValido(generalOrTexto) {
  if (generalOrTexto && typeof generalOrTexto === 'object') {
    return !!buscarTipoProyecto({
      codigo: generalOrTexto.tipo_proyecto_codigo,
      nombre: generalOrTexto.tipo_proyecto
    });
  }
  const t = String(generalOrTexto || '').trim();
  if (!t) return false;
  return !!buscarTipoProyecto({ codigo: t, nombre: t });
}

module.exports = {
  TIPOS_PROYECTO_CATALOGO,
  ESTRUCTURA_LABEL,
  buscarTipoProyecto,
  normalizarGeneralTipoProyecto,
  estructuraDesdeTipoProyecto,
  labelDesdeEstructura,
  listarTiposProyectoCatalogo,
  tipoProyectoValido,
  normalizarNombreTipo,
  normalizarCodigoTipo
};
