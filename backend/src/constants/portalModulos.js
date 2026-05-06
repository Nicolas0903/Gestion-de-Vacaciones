/**
 * IDs alineados con el portal (frontend) para modulos_portal en empleados.
 */
const MODULOS_PORTAL = [
  { id: 'vacaciones', etiqueta: 'Gestión de Vacaciones', descripcion: 'Solicitudes y calendario de vacaciones' },
  { id: 'boletas', etiqueta: 'Boletas de Pago', descripcion: 'Consulta y firma de boletas' },
  { id: 'permisos', etiqueta: 'Permisos y Descansos', descripcion: 'Permisos y descansos médicos' },
  { id: 'reembolsos', etiqueta: 'Reintegros / Reembolsos', descripcion: 'Solicitudes de reintegro de gastos' },
  { id: 'asistencia', etiqueta: 'Reporte de Asistencia', descripcion: 'Visualización del reporte de asistencia' },
  { id: 'caja-chica', etiqueta: 'Caja chica', descripcion: 'Reporte mensual de caja chica' },
  { id: 'solicitudes-registro', etiqueta: 'Solicitudes de Registro', descripcion: 'Aprobación de nuevas cuentas' },
  { id: 'control-proyectos', etiqueta: 'Control de Proyectos', descripcion: 'Proyectos, registro de horas y seguimiento' }
];

const MODULO_IDS = new Set(MODULOS_PORTAL.map((m) => m.id));

module.exports = { MODULOS_PORTAL, MODULO_IDS };
