import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import RecuperarPassword from './pages/RecuperarPassword';
import RestablecerPassword from './pages/RestablecerPassword';
import SolicitarRegistro from './pages/SolicitarRegistro';
import Portal from './pages/Portal';
import Dashboard from './pages/Dashboard';
import MisSolicitudes from './pages/MisSolicitudes';
import NuevaSolicitud from './pages/NuevaSolicitud';
import DetalleSolicitud from './pages/DetalleSolicitud';
import Aprobaciones from './pages/Aprobaciones';
import Calendario from './pages/Calendario';
import EstadoVacaciones from './pages/EstadoVacaciones';
import VacacionesGanadas from './pages/VacacionesGanadas';
import MiPerfil from './pages/MiPerfil';
import ReporteAsistencia from './pages/ReporteAsistencia';
import MisBoletas from './pages/MisBoletas';
import GestionBoletas from './pages/GestionBoletas';
import MisPermisos from './pages/MisPermisos';
import GestionPermisos from './pages/GestionPermisos';
import SolicitudesRegistro from './pages/admin/SolicitudesRegistro';
import Reembolsos from './pages/Reembolsos';
import GestionReembolsos from './pages/GestionReembolsos';
import CajaChica from './pages/CajaChica';
import ControlProyectos from './pages/ControlProyectos';
import AdminCostoHoraProyectos from './pages/AdminCostoHoraProyectos';
import AdministracionUsuarios from './pages/AdministracionUsuarios';

// Components
import Layout from './components/Layout';
import PageWrapper from './components/PageWrapper';
import LoadingSpinner from './components/LoadingSpinner';

// Ruta protegida
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, tieneRol } = useAuth();

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

function ModuloPortalRoute({ moduloId, children }) {
  const { loading, puedeAccederModuloPortal } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!puedeAccederModuloPortal(moduloId)) {
    return <Navigate to="/portal" replace />;
  }
  return children;
}

function AdminPortalUsuariosRoute({ children }) {
  const { loading, esAdminPortalUsuarios } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!esAdminPortalUsuarios()) {
    return <Navigate to="/portal" replace />;
  }
  return children;
}

function ReembolsosGestionGate() {
  const { esAdmin, esAprobadorReembolsos, puedeAccederModuloPortal } = useAuth();
  if (!puedeAccederModuloPortal('reembolsos')) {
    return <Navigate to="/portal" replace />;
  }
  // Admin puede entrar aunque no sea el aprobador designado (p. ej. para eliminar registros).
  if (!esAdmin() && !esAprobadorReembolsos()) {
    return <Navigate to="/portal" replace />;
  }
  return (
    <PageWrapper>
      <GestionReembolsos />
    </PageWrapper>
  );
}

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
      
      {/* Rutas públicas de autenticación */}
      <Route 
        path="/recuperar-password" 
        element={isAuthenticated ? <Navigate to="/portal" replace /> : <RecuperarPassword />} 
      />
      <Route 
        path="/restablecer-password/:token" 
        element={isAuthenticated ? <Navigate to="/portal" replace /> : <RestablecerPassword />} 
      />
      <Route 
        path="/crear-cuenta" 
        element={isAuthenticated ? <Navigate to="/portal" replace /> : <SolicitarRegistro />} 
      />
      
      {/* Portal Principal */}
      <Route path="/portal" element={
        <ProtectedRoute>
          <Portal />
        </ProtectedRoute>
      } />

      <Route
        path="/admin-portal/usuarios"
        element={
          <ProtectedRoute>
            <AdminPortalUsuariosRoute>
              <AdministracionUsuarios />
            </AdminPortalUsuariosRoute>
          </ProtectedRoute>
        }
      />

      {/* Reporte de Asistencia (fuera del layout de vacaciones) */}
      <Route path="/reporte-asistencia" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="asistencia">
            <ReporteAsistencia />
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Módulo de Boletas de Pago */}
      <Route path="/boletas" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="boletas">
            <PageWrapper><MisBoletas /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/boletas/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <ModuloPortalRoute moduloId="boletas">
            <PageWrapper><GestionBoletas /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Módulo de Permisos y Descansos */}
      <Route path="/permisos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="permisos">
            <PageWrapper><MisPermisos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/permisos/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <ModuloPortalRoute moduloId="permisos">
            <PageWrapper><GestionPermisos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Gestión de reembolsos */}
      <Route path="/reembolsos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="reembolsos">
            <PageWrapper><Reembolsos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      <Route path="/reembolsos/gestion" element={
        <ProtectedRoute>
          <ReembolsosGestionGate />
        </ProtectedRoute>
      } />

      <Route path="/caja-chica" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="caja-chica">
            <PageWrapper><CajaChica /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper><ControlProyectos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/admin/control-proyectos-costo-hora" element={
        <ProtectedRoute roles={['admin']}>
          <PageWrapper><AdminCostoHoraProyectos /></PageWrapper>
        </ProtectedRoute>
      } />

      {/* Gestión de Solicitudes de Registro */}
      <Route path="/admin/solicitudes-registro" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="solicitudes-registro">
            <PageWrapper><SolicitudesRegistro /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Módulo de Vacaciones */}
      <Route path="/vacaciones" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="vacaciones">
            <Layout />
          </ModuloPortalRoute>
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
        <Route
          path="empleados"
          element={<Navigate to="/vacaciones/dashboard" replace />}
        />
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


