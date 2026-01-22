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
    isAuthenticated: !!usuario
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


