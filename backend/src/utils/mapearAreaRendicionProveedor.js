const { AREAS_SOLICITANTE_VALUES } = require('../constants/proveedoresCatalogos');

const MAP_RENDICION_A_PROVEEDOR = {
  gerencia_general: 'gerencia',
  consultoria: 'operaciones',
  administracion: 'administracion',
  operaciones: 'operaciones',
  marketing: 'marketing',
  comercial: 'comercial'
};

function mapearAreaRendicionAProveedor(areaRendicion) {
  const mapped = MAP_RENDICION_A_PROVEEDOR[areaRendicion];
  if (mapped && AREAS_SOLICITANTE_VALUES.has(mapped)) return mapped;
  return 'otros';
}

module.exports = { mapearAreaRendicionAProveedor };
