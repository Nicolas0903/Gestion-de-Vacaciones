import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Portal from './pages/Portal';
import Dashboard from './pages/Dashboard';
import MisSolicitudes from './pages/MisSolicitudes';
import NuevaSolicitud from './pages/NuevaSolicitud';
import DetalleSolicitud from './pages/DetalleSolicitud';
import Aprobaciones from './pages/Aprobaciones';
import Calendario from './pages/Calendario';
import Empleados from './pages/Empleados';
import EstadoVacaciones from './pages/EstadoVacaciones';
import VacacionesGanadas from './pages/VacacionesGanadas';
import MiPerfil from './pages/MiPerfil';
import ReporteAsistencia from './pages/ReporteAsistencia';
import MisBoletas from './pages/MisBoletas';
import GestionBoletas from './pages/GestionBoletas';
import MisPermisos from './pages/MisPermisos';
import GestionPermisos from './pages/GestionPermisos';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Ruta protegida
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, usuario, tieneRol } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !tieneRol(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/portal" replace /> : <Login />} 
      />
      
      {/* Portal Principal */}
      <Route path="/portal" element={
        <ProtectedRoute>
          <Portal />
        </ProtectedRoute>
      } />

      {/* Reporte de Asistencia (fuera del layout de vacaciones) */}
      <Route path="/reporte-asistencia" element={
        <ProtectedRoute>
          <ReporteAsistencia />
        </ProtectedRoute>
      } />

      {/* Módulo de Boletas de Pago */}
      <Route path="/boletas" element={
        <ProtectedRoute>
          <MisBoletas />
        </ProtectedRoute>
      } />
      
      <Route path="/boletas/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <GestionBoletas />
        </ProtectedRoute>
      } />

      {/* Módulo de Permisos y Descansos */}
      <Route path="/permisos" element={
        <ProtectedRoute>
          <MisPermisos />
        </ProtectedRoute>
      } />
      
      <Route path="/permisos/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <GestionPermisos />
        </ProtectedRoute>
      } />

      {/* Módulo de Vacaciones */}
      <Route path="/vacaciones" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/vacaciones/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vacaciones-ganadas" element={<VacacionesGanadas />} />
        <Route path="mis-solicitudes" element={<MisSolicitudes />} />
        <Route path="nueva-solicitud" element={<NuevaSolicitud />} />
        <Route path="solicitudes/:id" element={<DetalleSolicitud />} />
        <Route path="aprobaciones" element={
          <ProtectedRoute roles={['admin', 'jefe_operaciones', 'contadora']}>
            <Aprobaciones />
          </ProtectedRoute>
        } />
        <Route path="calendario" element={<Calendario />} />
        <Route path="empleados" element={
          <ProtectedRoute roles={['admin', 'contadora']}>
            <Empleados />
          </ProtectedRoute>
        } />
        <Route path="estado-vacaciones" element={
          <ProtectedRoute roles={['admin', 'contadora']}>
            <EstadoVacaciones />
          </ProtectedRoute>
        } />
        <Route path="perfil" element={<MiPerfil />} />
      </Route>

      {/* Redirecciones por defecto */}
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router basename="/gestion-vacaciones">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Outfit, sans-serif',
              borderRadius: '12px',
            },
            success: {
              style: { background: '#10b981', color: 'white' },
              iconTheme: { primary: 'white', secondary: '#10b981' }
            },
            error: {
              style: { background: '#ef4444', color: 'white' },
              iconTheme: { primary: 'white', secondary: '#ef4444' }
            }
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;


