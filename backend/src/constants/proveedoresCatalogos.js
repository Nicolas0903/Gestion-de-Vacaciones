const TIPOS_PROVEEDOR = [
  { value: 'merchandising', label: 'Merchandising' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'dispensador_agua', label: 'Dispensador de agua' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'otros', label: 'Otros' }
];

const AREAS_SOLICITANTE = [
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'gerencia', label: 'Gerencia' },
  { value: 'administracion', label: 'Administración' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otros', label: 'Otros' }
];

const TIPOS_PROVEEDOR_VALUES = new Set(TIPOS_PROVEEDOR.map((t) => t.value));
const AREAS_SOLICITANTE_VALUES = new Set(AREAS_SOLICITANTE.map((a) => a.value));

const PUNTAJE_CRITERIO_OPCIONES = [10, 20, 30];

function calcularPuntajeTotal(c) {
  return (
    Number(c.puntaje_experiencia || 0) +
    Number(c.puntaje_precio || 0) +
    Number(c.puntaje_iso || 0) +
    Number(c.puntaje_valor_agregado || 0)
  );
}

const CRITERIOS_SELECCION_REEVAL = [
  { value: 'historico', label: 'Histórico' },
  { value: 'unico', label: 'Único' },
  { value: 'evaluado', label: 'Evaluado' }
];

const CONFORMIDAD_REEVAL = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' }
];

const RESULTADO_REEVAL_LABEL = {
  apto: 'APTO',
  apto_con_restricciones: 'APTO CON RESTRICCIONES',
  no_apto: 'NO APTO'
};

/** Suma habido + entrega efectiva + precio mercado (máx. 25). */
function calcularPuntajeReeval(r) {
  return (
    Number(r.puntaje_habido || 0) +
    Number(r.puntaje_entrega_efectiva || 0) +
    Number(r.puntaje_precio_mercado || 0)
  );
}

/** =SI(puntaje>21;"APTO";SI(puntaje>15;"APTO CON RESTRICCIONES";"NO APTO")) */
function calcularResultadoReeval(puntaje) {
  const p = Number(puntaje);
  if (p > 21) return 'apto';
  if (p > 15) return 'apto_con_restricciones';
  return 'no_apto';
}

function diasHasta(fechaIso) {
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(String(fechaIso).slice(0, 10) + 'T12:00:00');
  return Math.round((f - hoy) / 86400000);
}

module.exports = {
  TIPOS_PROVEEDOR,
  AREAS_SOLICITANTE,
  TIPOS_PROVEEDOR_VALUES,
  AREAS_SOLICITANTE_VALUES,
  PUNTAJE_CRITERIO_OPCIONES,
  CRITERIOS_SELECCION_REEVAL,
  CONFORMIDAD_REEVAL,
  RESULTADO_REEVAL_LABEL,
  calcularPuntajeTotal,
  calcularPuntajeReeval,
  calcularResultadoReeval,
  diasHasta
};
