import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  evaluarAccesoModuloPortal,
  buildAccesoPortalOpts
} from './utils/accesoPortal';

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
import RendicionPresupuesto from './pages/RendicionPresupuesto';
import GestionRendicionPresupuesto from './pages/GestionRendicionPresupuesto';
import CajaChica from './pages/CajaChica';
import RendicionCaja from './pages/RendicionCaja';
import ControlProyectos from './pages/ControlProyectos';
import ControlProyectosReporte from './pages/ControlProyectosReporte';
import ControlProyectosReporteProyectos from './pages/ControlProyectosReporteProyectos';
import ControlProyectosReporteActividades from './pages/ControlProyectosReporteActividades';
import ControlProyectosReporteLocadores from './pages/ControlProyectosReporteLocadores';
import AdminCostoHoraProyectos from './pages/AdminCostoHoraProyectos';
import AdminLocadoresBolsaHoras from './pages/AdminLocadoresBolsaHoras';
import AdministracionUsuarios from './pages/AdministracionUsuarios';
import Proveedores from './pages/Proveedores';
import ArchivoRespaldos from './pages/ArchivoRespaldos';
import ComisionesPorPagar from './pages/ComisionesPorPagar';
import ConsumoFabric from './pages/ConsumoFabric';
import Cotizaciones from './pages/Cotizaciones';
import SolicitudCotizacion from './pages/SolicitudCotizacion';
import CierreNegocio from './pages/CierreNegocio';

// Components
import Layout from './components/Layout';
import PageWrapper from './components/PageWrapper';
import LoadingSpinner from './components/LoadingSpinner';
import AsistenteIaBubble from './components/AsistenteIaBubble';

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
  const { loading, usuario, refrescarUsuario } = useAuth();
  const [verificando, setVerificando] = useState(true);
  const [permitido, setPermitido] = useState(false);

  useEffect(() => {
    if (loading) return undefined;

    let cancelado = false;
    const evaluar = (u) =>
      evaluarAccesoModuloPortal(u, moduloId, buildAccesoPortalOpts(u));

    (async () => {
      setVerificando(true);
      let u = usuario;
      if (!evaluar(u)) {
        u = (await refrescarUsuario()) || usuario;
      }
      if (cancelado) return;
      const ok = evaluar(u);
      setPermitido(ok);
      setVerificando(false);
      if (!ok) {
        toast.error(
          'No tienes acceso a este módulo. Si te lo acaban de asignar en Usuarios, recarga la página o cierra sesión y vuelve a entrar.'
        );
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [loading, moduloId, usuario?.id, refrescarUsuario]);

  if (loading || verificando) {
    return <LoadingSpinner />;
  }
  if (!permitido) {
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
  if (!esAdmin() && !esAprobadorReembolsos()) {
    return <Navigate to="/portal" replace />;
  }
  // Admin puede gestionar aunque tenga reembolsos desactivado en modulos_portal (p. ej. solo caja chica).
  if (!esAdmin() && !puedeAccederModuloPortal('reembolsos')) {
    return <Navigate to="/portal" replace />;
  }
  return (
    <PageWrapper guiaModuloId="reembolsos" guiaVariant="gestion">
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
            <PageWrapper guiaModuloId="boletas"><MisBoletas /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/boletas/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <ModuloPortalRoute moduloId="boletas">
            <PageWrapper guiaModuloId="boletas" guiaVariant="gestion"><GestionBoletas /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Módulo de Permisos y Descansos */}
      <Route path="/permisos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="permisos">
            <PageWrapper guiaModuloId="permisos"><MisPermisos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/permisos/gestion" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <ModuloPortalRoute moduloId="permisos">
            <PageWrapper guiaModuloId="permisos" guiaVariant="gestion"><GestionPermisos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      {/* Gestión de reembolsos */}
      <Route path="/reembolsos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="reembolsos">
            <PageWrapper guiaModuloId="reembolsos"><Reembolsos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      <Route path="/reembolsos/gestion" element={
        <ProtectedRoute>
          <ReembolsosGestionGate />
        </ProtectedRoute>
      } />

      {/* Rendición de Presupuesto (acceso restringido por modulos_portal) */}
      <Route path="/rendicion-presupuesto" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="rendicion-presupuesto">
            <PageWrapper guiaModuloId="rendicion-presupuesto"><RendicionPresupuesto /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />
      <Route path="/rendicion-presupuesto/gestion" element={
        <ProtectedRoute roles={['admin']}>
          <ModuloPortalRoute moduloId="rendicion-presupuesto">
            <PageWrapper guiaModuloId="rendicion-presupuesto" guiaVariant="gestion"><GestionRendicionPresupuesto /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/caja-chica" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="caja-chica">
            <PageWrapper guiaModuloId="caja-chica"><CajaChica /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/caja-rendicion" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="caja-rendicion">
            <PageWrapper guiaModuloId="caja-rendicion"><RendicionCaja /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/proveedores" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="proveedores">
            <PageWrapper guiaModuloId="proveedores"><Proveedores /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/archivo-respaldos" element={
        <ProtectedRoute roles={['admin', 'contadora']}>
          <ModuloPortalRoute moduloId="archivo-respaldos">
            <PageWrapper guiaModuloId="archivo-respaldos"><ArchivoRespaldos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/comisiones-por-pagar" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="comisiones-por-pagar">
            <PageWrapper wide guiaModuloId="comisiones-por-pagar"><ComisionesPorPagar /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/consumo-fabric" element={
        <ProtectedRoute roles={['admin']}>
          <ModuloPortalRoute moduloId="consumo-fabric">
            <PageWrapper wide guiaModuloId="consumo-fabric"><ConsumoFabric /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/solicitud-cotizacion" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="solicitud-cotizacion">
            <PageWrapper wide guiaModuloId="solicitud-cotizacion"><SolicitudCotizacion /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/cotizaciones" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="cotizaciones">
            <PageWrapper wide guiaModuloId="cotizaciones"><Cotizaciones /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/cierre-negocio" element={
        <ProtectedRoute roles={['admin']}>
          <ModuloPortalRoute moduloId="cierre-negocio">
            <PageWrapper wide guiaModuloId="cierre-negocio"><CierreNegocio /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper guiaModuloId="control-proyectos"><ControlProyectos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos/reporte/actividades" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper wide guiaModuloId="control-proyectos" guiaVariant="reportes"><ControlProyectosReporteActividades /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos/reporte/locadores" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper wide guiaModuloId="control-proyectos" guiaVariant="reportes"><ControlProyectosReporteLocadores /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos/reporte/proyectos" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper wide guiaModuloId="control-proyectos" guiaVariant="reportes"><ControlProyectosReporteProyectos /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/control-proyectos/reporte" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="control-proyectos">
            <PageWrapper wide guiaModuloId="control-proyectos" guiaVariant="reportes"><ControlProyectosReporte /></PageWrapper>
          </ModuloPortalRoute>
        </ProtectedRoute>
      } />

      <Route path="/admin/control-proyectos-costo-hora" element={
        <ProtectedRoute roles={['admin']}>
          <PageWrapper guiaModuloId="control-proyectos" guiaVariant="admin-config"><AdminCostoHoraProyectos /></PageWrapper>
        </ProtectedRoute>
      } />

      <Route path="/admin/control-proyectos-locadores" element={
        <ProtectedRoute roles={['admin']}>
          <PageWrapper guiaModuloId="control-proyectos" guiaVariant="admin-config"><AdminLocadoresBolsaHoras /></PageWrapper>
        </ProtectedRoute>
      } />

      {/* Gestión de Solicitudes de Registro */}
      <Route path="/admin/solicitudes-registro" element={
        <ProtectedRoute>
          <ModuloPortalRoute moduloId="solicitudes-registro">
            <PageWrapper guiaModuloId="solicitudes-registro"><SolicitudesRegistro /></PageWrapper>
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
      <Router basename="/">
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
        <AsistenteIaBubble />
      </Router>
    </AuthProvider>
  );
}

export default App;


