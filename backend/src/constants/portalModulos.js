/**
 * IDs alineados con el portal (frontend) para modulos_portal en empleados.
 */
const MODULOS_PORTAL = [
  { id: 'vacaciones', etiqueta: 'Gesti?n de Vacaciones', descripcion: 'Solicitudes y calendario de vacaciones' },
  { id: 'boletas', etiqueta: 'Boletas de Pago', descripcion: 'Consulta y firma de boletas' },
  { id: 'permisos', etiqueta: 'Permisos y Descansos', descripcion: 'Permisos y descansos m?dicos' },
  { id: 'reembolsos', etiqueta: 'Reintegros / Reembolsos', descripcion: 'Solicitudes de reintegro de gastos' },
  { id: 'rendicion-presupuesto', etiqueta: 'Rendici?n de Presupuesto', descripcion: 'Reembolsos y rendici?n por ?rea (acceso restringido)' },
  { id: 'asistencia', etiqueta: 'Reporte de Asistencia', descripcion: 'Visualizaci?n del reporte de asistencia' },
  {
    id: 'caja-chica',
    etiqueta: 'Rendici?n Caja Chica',
    descripcion: 'Reporte mensual: ingresos y egresos de caja chica'
  },
  {
    id: 'caja-rendicion',
    etiqueta: 'Rendici?n Presupuesto',
    descripcion: 'Dep?sitos y comprobantes de rendiciones de presupuesto aprobadas'
  },
  { id: 'solicitudes-registro', etiqueta: 'Solicitudes de Registro', descripcion: 'Aprobaci?n de nuevas cuentas' },
  { id: 'control-proyectos', etiqueta: 'Bolsa de Horas', descripcion: 'Proyectos, bolsa de horas y registro de actividades' },
  {
    id: 'proveedores',
    etiqueta: 'Gesti?n de Proveedores',
    descripcion: 'Lista de proveedores y evaluaci?n/selecci?n de nuevos'
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
  },
  {
    id: 'consumo-fabric',
    etiqueta: 'Consumo Fabric',
    descripcion: 'Reporte de uso Microsoft Fabric desde PAYG y monto mensual por cliente'
  },
  {
    id: 'solicitud-cotizacion',
    etiqueta: 'Solicitud de cotizaci?n',
    descripcion: 'Pedido comercial previo a elaborar la cotizaci?n formal'
  },
  {
    id: 'cotizaciones',
    etiqueta: 'Cotizaciones',
    descripcion: 'Elaboraci?n y versionado de cotizaciones comerciales'
  },
  {
    id: 'cierre-negocio',
    etiqueta: 'Cierre de Negocio',
    descripcion: 'Seguimiento post-venta cruzado con cotizacion final'
  }
];

const MODULO_IDS = new Set(MODULOS_PORTAL.map((m) => m.id));

module.exports = { MODULOS_PORTAL, MODULO_IDS };
