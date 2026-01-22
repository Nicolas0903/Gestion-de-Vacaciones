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

export default api;

