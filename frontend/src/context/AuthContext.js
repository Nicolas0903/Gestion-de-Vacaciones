import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    
    if (token && usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
      // Verificar que el token siga siendo válido
      authService.perfil()
        .then(res => {
          setUsuario(res.data.data);
          localStorage.setItem('usuario', JSON.stringify(res.data.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);
      const { token, usuario: usuarioData } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuarioData));
      setUsuario(usuarioData);
      
      return { success: true };
    } catch (err) {
      console.error('Error de login:', err);
      let mensaje = 'Error al iniciar sesión';
      
      if (err.response?.data?.mensaje) {
        mensaje = err.response.data.mensaje;
      } else if (err.response?.status === 401) {
        mensaje = 'Email o contraseña incorrectos';
      } else if (err.response?.status === 404) {
        mensaje = 'Servicio no disponible. Por favor intente más tarde.';
      } else if (!err.response) {
        mensaje = 'Error de conexión. Verifique su internet.';
      }
      
      setError(mensaje);
      return { success: false, mensaje };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const tieneRol = (...roles) => {
    if (!usuario) return false;
    return roles.includes(usuario.rol_nombre);
  };

  const puedeAprobar = () => {
    if (!usuario) return false;
    return usuario.nivel_aprobacion >= 1;
  };

  const esAdmin = () => tieneRol('admin');
  const esJefe = () => tieneRol('jefe_operaciones', 'admin');
  const esContadora = () => tieneRol('contadora', 'admin');

  // Usuarios autorizados para ver el reporte de asistencia (por email)
  const USUARIOS_REPORTE_ASISTENCIA = [
    'rocio.picon@prayaga.biz',
    'enrique.prayaga@prayaga.biz',
    'nicolas.valdivia@prayaga.biz'
  ];

  const EMAILS_MODULO_CAJA_CHICA = [
    'rocio.picon@prayaga.biz',
    'veronica.gonzales@prayaga.biz',
    'enrique.prayaga@prayaga.biz',
    'enrique.agapito@prayaga.biz',
    'nicolas.valdivia@prayaga.biz'
  ];

  const ADMIN_PORTAL_USUARIOS_EMAILS = (
    process.env.REACT_APP_ADMIN_PORTAL_USUARIOS_EMAILS ||
    'enrique.agapito@prayaga.biz,nicolas.valdivia@prayaga.biz'
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const esAdminPortalUsuarios = () => {
    if (!usuario?.email) return false;
    return ADMIN_PORTAL_USUARIOS_EMAILS.includes(usuario.email.toLowerCase().trim());
  };

  const puedeVerReporteAsistencia = () => {
    if (!usuario) return false;
    if (tieneRol('admin')) return true;
    return USUARIOS_REPORTE_ASISTENCIA.includes(usuario.email?.toLowerCase());
  };

  /**
   * Si hay mapa modulos_portal guardado, solo módulos con true. Si no, lógica histórica por rol/correo.
   */
  /** Admin o Verónica: pueden crear/editar proyectos en Control de Proyectos */
  const puedeGestionarProyectosCp = () => {
    if (!usuario) return false;
    if (esAdmin()) return true;
    return (usuario.email || '').toLowerCase().trim() === 'veronica.gonzales@prayaga.biz';
  };

  const puedeAccederModuloPortal = (moduloId) => {
    if (!usuario) return false;
    const em = (usuario.email || '').toLowerCase().trim();
    if (moduloId === 'caja-chica' && EMAILS_MODULO_CAJA_CHICA.includes(em)) {
      return true;
    }

    const m = usuario.modulos_portal;
    const tieneMapa = m && typeof m === 'object' && Object.keys(m).length > 0;
    if (tieneMapa) {
      return m[moduloId] === true;
    }

    const baseColaborador = ['vacaciones', 'boletas', 'permisos', 'reembolsos', 'control-proyectos'];
    if (baseColaborador.includes(moduloId)) return true;

    if (moduloId === 'asistencia') {
      return puedeVerReporteAsistencia();
    }

    if (moduloId === 'caja-chica') {
      return esAdmin() || esContadora();
    }

    if (moduloId === 'solicitudes-registro') {
      return esAdmin() || esContadora();
    }

    return true;
  };

  const esAprobadorReembolsos = () =>
    !!usuario &&
    (usuario.es_aprobador_reembolsos === true ||
      tieneRol('admin') ||
      /* respaldo sesión antigua sin flag */
      (usuario.email || '').toLowerCase().trim() ===
        (process.env.REACT_APP_REEMBOLSOS_APROBADOR_EMAIL || 'enrique.agapito@prayaga.biz'));

  const value = {
    usuario,
    loading,
    error,
    login,
    logout,
    tieneRol,
    puedeAprobar,
    esAdmin,
    esJefe,
    esContadora,
    puedeVerReporteAsistencia,
    esAprobadorReembolsos,
    esAdminPortalUsuarios,
    puedeAccederModuloPortal,
    puedeGestionarProyectosCp,
    isAuthenticated: !!usuario
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


