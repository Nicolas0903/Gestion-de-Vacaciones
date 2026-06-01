/**
 * IDs alineados con el portal (frontend) para modulos_portal en empleados.
 */
const MODULOS_PORTAL = [
  { id: 'vacaciones', etiqueta: 'Gestión de Vacaciones', descripcion: 'Solicitudes y calendario de vacaciones' },
  { id: 'boletas', etiqueta: 'Boletas de Pago', descripcion: 'Consulta y firma de boletas' },
  { id: 'permisos', etiqueta: 'Permisos y Descansos', descripcion: 'Permisos y descansos médicos' },
  { id: 'reembolsos', etiqueta: 'Reintegros / Reembolsos', descripcion: 'Solicitudes de reintegro de gastos' },
  { id: 'rendicion-presupuesto', etiqueta: 'Rendición de Presupuesto', descripcion: 'Reembolsos y rendición por área (acceso restringido)' },
  { id: 'asistencia', etiqueta: 'Reporte de Asistencia', descripcion: 'Visualización del reporte de asistencia' },
  {
    id: 'caja-chica',
    etiqueta: 'Rendición Caja Chica',
    descripcion: 'Reporte mensual: ingresos y egresos de caja chica'
  },
  {
    id: 'caja-rendicion',
    etiqueta: 'Rendición Presupuesto',
    descripcion: 'Depósitos y comprobantes de rendiciones de presupuesto aprobadas'
  },
  { id: 'solicitudes-registro', etiqueta: 'Solicitudes de Registro', descripcion: 'Aprobación de nuevas cuentas' },
  { id: 'control-proyectos', etiqueta: 'Bolsa de Horas', descripcion: 'Proyectos, bolsa de horas y registro de actividades' },
  {
    id: 'proveedores',
    etiqueta: 'Gestión de Proveedores',
    descripcion: 'Lista de proveedores y evaluación/selección de nuevos'
  },
  {
    id: 'archivo-respaldos',
    etiqueta: 'Archivo / Respaldos',
    descripcion: 'Copias diarias legibles (Excel) y descarga de volcados SQL'
  },
  {
    id: 'comisiones-por-pagar',
    etiqueta: 'Comisiones por Pagar',
    descripcion: 'Seguimiento de comisiones por vendedor, cliente y cuotas de pago'
  }
];

const MODULO_IDS = new Set(MODULOS_PORTAL.map((m) => m.id));

module.exports = { MODULOS_PORTAL, MODULO_IDS };
