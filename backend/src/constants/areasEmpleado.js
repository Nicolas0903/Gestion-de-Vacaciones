/**
 * Áreas organizacionales válidas para un empleado.
 *
 * Mantener este listado en sync con:
 *  - ENUM `empleados.area` en la base de datos.
 *  - `AREAS_VALIDAS` de `RendicionPresupuesto` (mismas claves).
 *  - El catálogo del frontend que muestra el select.
 */

const AREAS_EMPLEADO_VALIDAS = [
  'gerencia_general',
  'consultoria',
  'administracion',
  'operaciones',
  'marketing',
  'comercial'
];

const AREAS_EMPLEADO_LABEL = {
  gerencia_general: 'Gerencia General',
  consultoria: 'Consultoría',
  administracion: 'Administración',
  operaciones: 'Operaciones',
  marketing: 'Marketing',
  comercial: 'Comercial'
};

module.exports = {
  AREAS_EMPLEADO_VALIDAS,
  AREAS_EMPLEADO_LABEL
};
