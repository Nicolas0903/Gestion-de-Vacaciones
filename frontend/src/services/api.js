import axios from 'axios';

/** Base del API: env > mismo origen /api > localhost dev. */
function resolveApiBaseUrl() {
  const fromEnv = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return fromEnv || 'http://localhost:3002/api';
}

const API_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  /* FormData: quitar Content-Type por defecto (application/json) para que el navegador
   * envíe multipart/form-data con boundary. Si no, multer no recibe archivo → 400. */
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo redirigir al login si el 401 NO es del endpoint de login
    // (para no redirigir cuando las credenciales son incorrectas)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      // Usar la ruta correcta con el basename
      const basePath = process.env.PUBLIC_URL || '';
      window.location.href = `${basePath}/login`;
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  perfil: () => api.get('/auth/perfil'),
  cambiarPassword: (passwordActual, passwordNuevo) => 
    api.put('/auth/cambiar-password', { passwordActual, passwordNuevo }),
};

// Empleados
export const empleadoService = {
  listar: (filtros = {}) => api.get('/empleados', { params: filtros }),
  obtener: (id) => api.get(`/empleados/${id}`),
  crear: (datos) => api.post('/empleados', datos),
  actualizar: (id, datos) => api.put(`/empleados/${id}`, datos),
  desactivar: (id) => api.put(`/empleados/${id}/desactivar`),
  reactivar: (id) => api.put(`/empleados/${id}/reactivar`),
  obtenerSubordinados: (id) => api.get(`/empleados/${id}/subordinados`),
  cambiarPassword: (passwordActual, passwordNueva, passwordConfirmacion) => 
    api.put('/empleados/me/cambiar-password', { 
      password_actual: passwordActual, 
      password_nueva: passwordNueva,
      password_confirmacion: passwordConfirmacion 
    }),
};

// Solicitudes
export const solicitudService = {
  crear: (datos) => api.post('/solicitudes', datos),
  listarMias: (filtros = {}) => api.get('/solicitudes/mis-solicitudes', { params: filtros }),
  listarPendientes: () => api.get('/solicitudes/pendientes-aprobacion'),
  listarTodas: (filtros = {}) => api.get('/solicitudes/todas', { params: filtros }),
  obtener: (id) => api.get(`/solicitudes/${id}`),
  enviar: (id) => api.put(`/solicitudes/${id}/enviar`),
  aprobar: (id, comentarios = '') => api.put(`/solicitudes/${id}/aprobar`, { comentarios }),
  rechazar: (id, comentarios) => api.put(`/solicitudes/${id}/rechazar`, { comentarios }),
  cancelar: (id) => api.put(`/solicitudes/${id}/cancelar`),
  eliminar: (id) => api.delete(`/solicitudes/${id}`),
  calendario: (fechaInicio, fechaFin, empleadoId = null) => 
    api.get('/solicitudes/calendario', { 
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, empleado_id: empleadoId } 
    }),
  salidasPorPeriodo: (periodoId) => api.get(`/solicitudes/periodo/${periodoId}/salidas`),
};

// Períodos
export const periodoService = {
  misPeriodos: () => api.get('/periodos/mis-periodos'),
  misPendientes: () => api.get('/periodos/mis-periodos/pendientes'),
  miResumen: () => api.get('/periodos/mi-resumen'),
  porEmpleado: (empleadoId) => api.get(`/periodos/empleado/${empleadoId}`),
  resumenEmpleado: (empleadoId) => api.get(`/periodos/empleado/${empleadoId}/resumen`),
  crear: (datos) => api.post('/periodos', datos),
  actualizar: (id, datos) => api.put(`/periodos/${id}`, datos),
  generar: (empleadoId, fechaIngreso, anioHasta) => 
    api.post(`/periodos/empleado/${empleadoId}/generar`, { fecha_ingreso: fechaIngreso, anio_hasta: anioHasta }),
  eliminar: (id) => api.delete(`/periodos/${id}`),
};

// Notificaciones
export const notificacionService = {
  listar: (soloNoLeidas = false) => api.get('/notificaciones', { params: { solo_no_leidas: soloNoLeidas } }),
  contarNoLeidas: () => api.get('/notificaciones/no-leidas/count'),
  marcarLeida: (id) => api.put(`/notificaciones/${id}/leer`),
  marcarTodasLeidas: () => api.put('/notificaciones/leer-todas'),
  eliminar: (id) => api.delete(`/notificaciones/${id}`),
};

// PDF
export const pdfService = {
  descargarSolicitud: (id) => api.get(`/pdf/solicitud/${id}`, { responseType: 'blob' }),
};

// Boletas de Pago
export const boletaService = {
  // Empleados
  misBoletas: (anio = null) => api.get('/boletas/mis-boletas', { params: { anio } }),
  misAnios: () => api.get('/boletas/mis-anios'),
  firmar: (id) => api.put(`/boletas/${id}/firmar`),
  descargar: (id) => api.get(`/boletas/${id}/descargar`, { responseType: 'blob' }),
  
  // Admin
  listar: (filtros = {}) => api.get('/boletas', { params: filtros }),
  obtenerAnios: () => api.get('/boletas/anios'),
  obtenerResumen: (anio, mes) => api.get('/boletas/resumen', { params: { anio, mes } }),
  subir: (formData) => api.post('/boletas/subir', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  subirMasivo: (formData) => api.post('/boletas/subir-masivo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  eliminar: (id) => api.delete(`/boletas/${id}`),
};

// Permisos y Descansos
export const permisoService = {
  // Empleados
  misPermisos: (filtros = {}) => api.get('/permisos/mis-permisos', { params: filtros }),
  miResumen: (anio = null) => api.get('/permisos/mi-resumen', { params: { anio } }),
  crear: (formData) => api.post('/permisos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  obtener: (id) => api.get(`/permisos/${id}`),
  eliminar: (id) => api.delete(`/permisos/${id}`),
  descargarDocumento: (id) => api.get(`/permisos/${id}/documento`, { responseType: 'blob' }),

  calendarioEquipo: (fechaInicio, fechaFin, empleadoId = null) =>
    api.get('/permisos/calendario', {
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, empleado_id: empleadoId }
    }),

  // Admin
  listar: (filtros = {}) => api.get('/permisos', { params: filtros }),
  listarPendientes: () => api.get('/permisos/admin/pendientes'),
  calendario: (fechaInicio, fechaFin, empleadoId = null) => 
    api.get('/permisos/admin/calendario', { 
      params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin, empleado_id: empleadoId } 
    }),
  crearDesdeAdmin: (formData) => api.post('/permisos/admin/crear', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  aprobar: (id, comentarios = '') => api.put(`/permisos/${id}/aprobar`, { comentarios }),
  rechazar: (id, comentarios) => api.put(`/permisos/${id}/rechazar`, { comentarios }),
};

// Reembolsos
export const reembolsoService = {
  crear: (formData) =>
    api.post('/reembolsos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  misSolicitudes: () => api.get('/reembolsos/mis-solicitudes'),
  pendientes: () => api.get('/reembolsos/pendientes'),
  todos: (params = {}) => api.get('/reembolsos/todos', { params }),
  obtener: (id) => api.get(`/reembolsos/${id}`),
  descargarRecibo: (id) => api.get(`/reembolsos/${id}/recibo`, { responseType: 'blob' }),
  descargarComprobante: (id) => api.get(`/reembolsos/${id}/comprobante`, { responseType: 'blob' }),
  aprobar: (id, comentarios = '') => api.put(`/reembolsos/${id}/aprobar`, { comentarios }),
  rechazar: (id, comentarios) => api.put(`/reembolsos/${id}/rechazar`, { comentarios }),
  observar: (id, comentarios) => api.put(`/reembolsos/${id}/observar`, { comentarios }),
  eliminar: (id) => api.delete(`/reembolsos/${id}`),
  actualizarAdmin: (id, formData) =>
    api.put(`/reembolsos/${id}/admin`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  convertirAReciboInterno: (id, datos) =>
    api.put(`/reembolsos/${id}/admin/convertir-recibo-interno`, datos),
};

// Rendición de Presupuesto (módulo paralelo a reembolsos con campo "área")
export const rendicionPresupuestoService = {
  areas: () => api.get('/rendiciones-presupuesto/areas'),
  crear: (formData) =>
    api.post('/rendiciones-presupuesto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  misSolicitudes: () => api.get('/rendiciones-presupuesto/mis-solicitudes'),
  pendientes: () => api.get('/rendiciones-presupuesto/pendientes'),
  todos: (params = {}) => api.get('/rendiciones-presupuesto/todos', { params }),
  obtener: (id) => api.get(`/rendiciones-presupuesto/${id}`),
  descargarComprobante: (id) =>
    api.get(`/rendiciones-presupuesto/${id}/comprobante`, { responseType: 'blob' }),
  aprobar: (id, comentarios = '') =>
    api.put(`/rendiciones-presupuesto/${id}/aprobar`, { comentarios }),
  rechazar: (id, comentarios) =>
    api.put(`/rendiciones-presupuesto/${id}/rechazar`, { comentarios }),
  observar: (id, comentarios) =>
    api.put(`/rendiciones-presupuesto/${id}/observar`, { comentarios }),
  eliminar: (id) => api.delete(`/rendiciones-presupuesto/${id}`),
  actualizarAdmin: (id, formData) =>
    api.put(`/rendiciones-presupuesto/${id}/admin`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Administración de usuarios del portal (solo correos autorizados)
export const adminPortalUsuariosService = {
  listarEmpleados: (params = {}) =>
    api.get('/admin-portal-usuarios/empleados', { params }),
  obtener: (id) => api.get(`/admin-portal-usuarios/empleados/${id}`),
  vacacionesEmpleado: (id) => api.get(`/admin-portal-usuarios/empleados/${id}/vacaciones`),
  crear: (body) => api.post('/admin-portal-usuarios/empleados', body),
  actualizarCuenta: (id, body) =>
    api.put(`/admin-portal-usuarios/empleados/${id}/cuenta`, body),
  actualizarModulos: (id, modulos_portal) =>
    api.put(`/admin-portal-usuarios/empleados/${id}/modulos-portal`, { modulos_portal }),
  bloquear: (id) => api.put(`/admin-portal-usuarios/empleados/${id}/bloquear`),
  eliminarPermanente: (id) => api.delete(`/admin-portal-usuarios/empleados/${id}`),
  restablecerPassword: (id, password_nueva) =>
    api.post(`/admin-portal-usuarios/empleados/${id}/restablecer-password`, {
      password_nueva
    }),
  roles: () => api.get('/admin-portal-usuarios/roles')
};

// Rendición Caja Chica (admin / contadora)
export const cajaChicaService = {
  listarPeriodos: () => api.get('/caja-chica/periodos'),
  crearPeriodo: (anio, mes) => api.post('/caja-chica/periodos', { anio, mes }),
  detalle: (id) => api.get(`/caja-chica/periodos/${id}`),
  guardarIngresos: (id, ingresos) => api.put(`/caja-chica/periodos/${id}/ingresos`, { ingresos }),
  subirAdjuntoIngreso: (periodoId, ingresoId, file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post(`/caja-chica/periodos/${periodoId}/ingresos/${ingresoId}/adjunto`, fd);
  },
  descargarAdjuntoIngreso: (periodoId, ingresoId) =>
    api.get(`/caja-chica/periodos/${periodoId}/ingresos/${ingresoId}/adjunto`, { responseType: 'blob' }),
  eliminarAdjuntoIngreso: (periodoId, ingresoId) =>
    api.delete(`/caja-chica/periodos/${periodoId}/ingresos/${ingresoId}/adjunto`),
  cerrar: (id) => api.post(`/caja-chica/periodos/${id}/cerrar`),
  reabrir: (id) => api.post(`/caja-chica/periodos/${id}/reabrir`),
  enviarResumenRocio: (id) => api.post(`/caja-chica/periodos/${id}/enviar-resumen-rocio`),
  descargarResumenPdf: (id) =>
    api.get(`/caja-chica/periodos/${id}/resumen-pdf`, { responseType: 'blob' }),
};

// Rendición Presupuesto — depósitos sobre rendiciones aprobadas
export const rendicionCajaService = {
  listarPeriodos: () => api.get('/caja-rendicion/periodos'),
  sugerirPeriodos: () => api.get('/caja-rendicion/periodos/sugeridos'),
  crearPeriodo: (anio, mes) => api.post('/caja-rendicion/periodos', { anio, mes }),
  detalle: (id) => api.get(`/caja-rendicion/periodos/${id}`),
  guardarDepositos: (id, rendiciones) =>
    api.put(`/caja-rendicion/periodos/${id}/depositos`, { rendiciones }),
  subirComprobanteDeposito: (periodoId, rendicionId, file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post(
      `/caja-rendicion/periodos/${periodoId}/rendiciones/${rendicionId}/deposito-adjunto`,
      fd
    );
  },
  descargarComprobanteDeposito: (periodoId, rendicionId) =>
    api.get(
      `/caja-rendicion/periodos/${periodoId}/rendiciones/${rendicionId}/deposito-adjunto`,
      { responseType: 'blob' }
    ),
  eliminarComprobanteDeposito: (periodoId, rendicionId) =>
    api.delete(
      `/caja-rendicion/periodos/${periodoId}/rendiciones/${rendicionId}/deposito-adjunto`
    ),
  cerrar: (id) => api.post(`/caja-rendicion/periodos/${id}/cerrar`),
  reabrir: (id) => api.post(`/caja-rendicion/periodos/${id}/reabrir`)
};

// Gestión de proveedores (según modulos_portal; admin siempre)
export const proveedoresService = {
  catalogos: () => api.get('/proveedores/catalogos'),
  listar: (params = {}) => api.get('/proveedores', { params }),
  obtener: (id) => api.get(`/proveedores/${id}`),
  crear: (body) => api.post('/proveedores', body),
  actualizar: (id, body) => api.put(`/proveedores/${id}`, body),
  eliminar: (id) => api.delete(`/proveedores/${id}`),
  listarEvaluaciones: () => api.get('/proveedores/evaluaciones'),
  obtenerEvaluacion: (id) => api.get(`/proveedores/evaluaciones/${id}`),
  crearEvaluacion: (body) => api.post('/proveedores/evaluaciones', body),
  actualizarEvaluacion: (id, body) => api.put(`/proveedores/evaluaciones/${id}`, body),
  eliminarEvaluacion: (id) => api.delete(`/proveedores/evaluaciones/${id}`),
  registrarGanador: (evaluacionId, body) =>
    api.post(`/proveedores/evaluaciones/${evaluacionId}/registrar-ganador`, body),
  listarReevaluaciones: (params = {}) => api.get('/proveedores/reevaluaciones', { params }),
  obtenerReevaluacion: (id) => api.get(`/proveedores/reevaluaciones/${id}`),
  crearReevaluacion: (body) => api.post('/proveedores/reevaluaciones', body),
  actualizarReevaluacion: (id, body) => api.put(`/proveedores/reevaluaciones/${id}`, body),
  eliminarReevaluacion: (id) => api.delete(`/proveedores/reevaluaciones/${id}`)
};

export const backupsService = {
  listar: (params) => api.get('/backups', { params }),
  descargar: (id, tipo) => api.get(`/backups/${id}/descargar/${tipo}`, { responseType: 'blob' }),
  ejecutar: (body) => api.post('/backups/ejecutar', body)
};

export const consumoFabricService = {
  listarMontos: (params) => api.get('/consumo-fabric/montos', { params }),
  listarPeriodosMontos: () => api.get('/consumo-fabric/montos/periodos'),
  guardarMonto: (body) => api.post('/consumo-fabric/montos', body),
  eliminarMonto: (id) => api.delete(`/consumo-fabric/montos/${id}`),
  importarMontos: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post('/consumo-fabric/montos/importar', fd);
  },
  listarCargas: () => api.get('/consumo-fabric/cargas'),
  subirPayg: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post('/consumo-fabric/cargas', fd);
  },
  obtenerCarga: (id) => api.get(`/consumo-fabric/cargas/${id}`),
  exportarCarga: (id) =>
    api.get(`/consumo-fabric/cargas/${id}/exportar`, { responseType: 'blob' }),
  exportarCargaPdf: (id) =>
    api.get(`/consumo-fabric/cargas/${id}/exportar-pdf`, { responseType: 'blob' }),
  eliminarCarga: (id) => api.delete(`/consumo-fabric/cargas/${id}`)
};

export const comisionesPorPagarService = {
  listar: () => api.get('/comisiones-por-pagar'),
  obtener: (id) => api.get(`/comisiones-por-pagar/${id}`),
  crear: (body) => api.post('/comisiones-por-pagar', body),
  actualizar: (id, body) => api.put(`/comisiones-por-pagar/${id}`, body),
  eliminar: (id) => api.delete(`/comisiones-por-pagar/${id}`),
  crearPago: (id, body) => api.post(`/comisiones-por-pagar/${id}/pagos`, body),
  actualizarPago: (id, pagoId, body) => api.put(`/comisiones-por-pagar/${id}/pagos/${pagoId}`, body),
  eliminarPago: (id, pagoId) => api.delete(`/comisiones-por-pagar/${id}/pagos/${pagoId}`)
};

// Asistente IA (solo admin, lectura)
export const asistenteIaService = {
  estado: () => api.get('/asistente-ia/estado'),
  pendientes: () => api.get('/asistente-ia/pendientes'),
  enviarMensaje: (mensaje, historial = []) =>
    api.post('/asistente-ia/mensaje', { mensaje, historial })
};

export const controlProyectosService = {
  catalogo: () => api.get('/control-proyectos/catalogo'),
  consultoresSelect: (params) => api.get('/control-proyectos/consultores-select', { params }),
  listarProyectos: () => api.get('/control-proyectos/proyectos'),
  misProyectos: () => api.get('/control-proyectos/mis-proyectos'),
  crearProyecto: (body) => api.post('/control-proyectos/proyectos', body),
  actualizarProyecto: (id, body) => api.put(`/control-proyectos/proyectos/${id}`, body),
  eliminarProyecto: (id) => api.delete(`/control-proyectos/proyectos/${id}`),
  listarActividades: (params) => api.get('/control-proyectos/actividades', { params }),
  crearActividad: (body) => api.post('/control-proyectos/actividades', body),
  actualizarActividad: (id, body) => api.put(`/control-proyectos/actividades/${id}`, body),
  reporteDashboard: () => api.get('/control-proyectos/reporte'),
  reporteProyectosVistaBi: () => api.get('/control-proyectos/reporte', { params: { vista: 'proyectos' } }),
  reporteActividadesBi: (params) =>
    api.get('/control-proyectos/reporte', { params: { vista: 'actividades', ...params } }),
  reporteActividadesPdf: (params) =>
    api.get('/control-proyectos/reporte/actividades/pdf', { params, responseType: 'blob' }),
  listarCostosHora: () => api.get('/control-proyectos/costo-hora'),
  guardarCostoHora: (empleadoId, costoPorHora) =>
    api.put(`/control-proyectos/costo-hora/${empleadoId}`, { costo_por_hora: costoPorHora })
};

export default api;

