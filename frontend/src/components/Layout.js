import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionService } from '../services/api';
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  UsersIcon,
  UserCircleIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

const Layout = () => {
  const { usuario, logout, puedeAprobar, esAdmin, esContadora } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificacionesCount, setNotificacionesCount] = useState(0);

  useEffect(() => {
    const cargarNotificaciones = async () => {
      try {
        const res = await notificacionService.contarNoLeidas();
        setNotificacionesCount(res.data.data.total);
      } catch (error) {
        console.error('Error cargando notificaciones:', error);
      }
    };
    cargarNotificaciones();
    const interval = setInterval(cargarNotificaciones, 60000); // Cada minuto
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/vacaciones/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { to: '/vacaciones/perfil', icon: UserCircleIcon, label: 'Mi Perfil' },
    { to: '/vacaciones/vacaciones-ganadas', icon: CalendarDaysIcon, label: 'Vacaciones Ganadas' },
    { to: '/vacaciones/mis-solicitudes', icon: DocumentTextIcon, label: 'Mis Solicitudes' },
    { to: '/vacaciones/nueva-solicitud', icon: PlusCircleIcon, label: 'Nueva Solicitud' },
    { to: '/vacaciones/calendario', icon: CalendarDaysIcon, label: 'Calendario' },
  ];

  if (puedeAprobar()) {
    menuItems.splice(3, 0, { to: '/vacaciones/aprobaciones', icon: CheckBadgeIcon, label: 'Aprobaciones' });
  }

  if (esAdmin() || esContadora()) {
    menuItems.push({ to: '/vacaciones/empleados', icon: UsersIcon, label: 'Empleados' });
    menuItems.push({ to: '/vacaciones/estado-vacaciones', icon: ChartBarIcon, label: 'Estado de Vacaciones' });
  }

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
          isActive
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
            : 'text-slate-600 hover:bg-teal-50 hover:text-teal-600'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col glass rounded-r-3xl lg:rounded-3xl lg:m-4 shadow-xl">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    PRAYAGA
                  </h1>
                  <p className="text-xs text-slate-500">Gestor de Vacaciones</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {/* Botón volver al portal */}
            <NavLink
              to="/portal"
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors text-sm"
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span>Volver al Portal</span>
            </NavLink>
          </div>

          {/* Navegación */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Usuario */}
          <div className="p-4 border-t border-slate-200/50">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
                {usuario?.nombres?.charAt(0)}{usuario?.apellidos?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {usuario?.nombres} {usuario?.apellidos}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {usuario?.rol_nombre?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-h-screen lg:p-4">
        {/* Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-teal-600">PRAYAGA</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-slate-100 relative">
                <BellIcon className="w-6 h-6" />
                {notificacionesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificacionesCount}
                  </span>
                )}
              </button>
              <NavLink to="/perfil" className="p-2 rounded-lg hover:bg-slate-100">
                <UserCircleIcon className="w-6 h-6" />
              </NavLink>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-0 lg:pl-4">
          <div className="glass rounded-2xl lg:rounded-3xl min-h-full p-6 shadow-xl animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


