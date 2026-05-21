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

module.exports = {
  TIPOS_PROVEEDOR,
  AREAS_SOLICITANTE,
  TIPOS_PROVEEDOR_VALUES,
  AREAS_SOLICITANTE_VALUES,
  PUNTAJE_CRITERIO_OPCIONES,
  calcularPuntajeTotal
};
