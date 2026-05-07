import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

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
      const basePath = process.env.PUBLIC_URL || '/gestion-vacaciones';
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

// Caja chica (admin / contadora)
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

