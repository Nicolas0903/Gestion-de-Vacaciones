import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/api';
import { evaluarAccesoModuloPortal, parseModulosPortal, EMAILS_MODULO_CAJA_CHICA } from '../utils/accesoPortal';

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
      setUsuario(normalizarUsuario(JSON.parse(usuarioGuardado)));
      authService.perfil()
        .then(res => {
          const data = normalizarUsuario(res.data.data);
          setUsuario(data);
          localStorage.setItem('usuario', JSON.stringify(data));
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
      localStorage.setItem('usuario', JSON.stringify(normalizarUsuario(usuarioData)));
      setUsuario(normalizarUsuario(usuarioData));
      
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

  const normalizarUsuario = (data) => {
    if (!data) return null;
    return {
      ...data,
      modulos_portal: parseModulosPortal(data.modulos_portal)
    };
  };

  const refrescarUsuario = useCallback(async () => {
    try {
      const res = await authService.perfil();
      const data = normalizarUsuario(res.data.data);
      setUsuario(data);
      localStorage.setItem('usuario', JSON.stringify(data));
      return data;
    } catch {
      return null;
    }
  }, []);

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

  const ADMIN_PORTAL_USUARIOS_EMAILS = (
    process.env.REACT_APP_ADMIN_PORTAL_USUARIOS_EMAILS ||
    [
      'enrique.agapito@prayaga.biz',
      'nicolas.valdivia@prayaga.biz',
      'rocio.picon@prayaga.biz'
    ].join(',')
  )
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  /** Admin del sistema O correos autorizados (contadora RRHH típ.). No depende solo de rol contadora para no dar CRUD usuarios a toda contadora sin decidirlo. */
  const esAdminPortalUsuarios = () => {
    if (!usuario) return false;
    if (tieneRol('admin')) return true;
    if (!usuario.email) return false;
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
  /** Admin o cuenta de gestión (por defecto asistente@prayaga.biz): CRUD proyectos en Bolsa de Horas */
  const emailsGestionBolsaHorasCp = () => {
    const multi = process.env.REACT_APP_CONTROL_PROYECTOS_GESTORES_EMAIL;
    if (multi && String(multi).trim()) {
      return String(multi)
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
    }
    return [
      (process.env.REACT_APP_CONTROL_PROYECTOS_VERONICA_EMAIL || 'asistente@prayaga.biz')
        .toLowerCase()
        .trim()
    ];
  };

  const puedeGestionarProyectosCp = () => {
    if (!usuario) return false;
    if (esAdmin()) return true;
    const em = (usuario.email || '').toLowerCase().trim();
    return emailsGestionBolsaHorasCp().includes(em);
  };

  const accesoPortalOpts = useMemo(
    () => ({
      esAdmin,
      esContadora,
      puedeVerReporteAsistencia,
      emailsCajaChica: EMAILS_MODULO_CAJA_CHICA
    }),
    [usuario]
  );

  const puedeAccederModuloPortal = (moduloId) =>
    evaluarAccesoModuloPortal(usuario, moduloId, accesoPortalOpts);

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
    refrescarUsuario,
    isAuthenticated: !!usuario
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


