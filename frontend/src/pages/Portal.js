import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoTransparente from '../components/LogoTransparente';
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChartBarSquareIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  BanknotesIcon,
  WalletIcon,
  UsersIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

const Portal = () => {
  const {
    usuario,
    puedeAccederModuloPortal,
    esAdmin,
    esContadora,
    esAprobadorReembolsos,
    esAdminPortalUsuarios
  } = useAuth();

  const modulos = [
    {
      id: 'vacaciones',
      titulo: 'Gestión de Vacaciones',
      descripcion: 'Solicita, aprueba y gestiona las vacaciones del personal',
      icono: CalendarDaysIcon,
      color: 'from-teal-500 to-cyan-500',
      shadowColor: 'shadow-teal-500/30',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      link: '/vacaciones',
      activo: true
    },
    {
      id: 'boletas',
      titulo: 'Boletas de Pago',
      descripcion: 'Visualiza y firma tus boletas de pago mensuales',
      icono: DocumentTextIcon,
      color: 'from-violet-500 to-purple-500',
      shadowColor: 'shadow-violet-500/30',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      link: '/boletas',
      activo: true,
      adminLink: '/boletas/gestion' // Link especial para admin
    },
    {
      id: 'permisos',
      titulo: 'Permisos y Descansos',
      descripcion: 'Registra descansos médicos y solicita permisos',
      icono: ClipboardDocumentCheckIcon,
      color: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/30',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      link: '/permisos',
      activo: true,
      adminLink: '/permisos/gestion'
    },
    {
      id: 'reembolsos',
      titulo: 'Solicitud de reintegro',
      descripcion: 'Registra y da seguimiento a tus solicitudes de reintegro de gastos',
      icono: BanknotesIcon,
      color: 'from-sky-500 to-indigo-600',
      shadowColor: 'shadow-sky-500/30',
      bgLight: 'bg-sky-50',
      textColor: 'text-sky-600',
      link: '/reembolsos',
      activo: true,
      adminLink: '/reembolsos/gestion'
    }
  ];

  if (puedeAccederModuloPortal('asistencia')) {
    modulos.push({
      id: 'asistencia',
      titulo: 'Reporte de Asistencia',
      descripcion: 'Visualiza el reporte de asistencia del personal',
      icono: ChartBarSquareIcon,
      color: 'from-rose-500 to-pink-500',
      shadowColor: 'shadow-rose-500/30',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      link: '/reporte-asistencia',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('caja-chica')) {
    modulos.push({
      id: 'caja-chica',
      titulo: 'Caja chica',
      descripcion: 'Reporte mensual: ingresos manuales y egresos desde reintegros aprobados',
      icono: WalletIcon,
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/30',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/caja-chica',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('control-proyectos')) {
    modulos.push({
      id: 'control-proyectos',
      titulo: 'Control de proyectos',
      descripcion: 'Proyectos asignados y registro de horas por consultor',
      icono: BriefcaseIcon,
      color: 'from-indigo-500 to-violet-600',
      shadowColor: 'shadow-indigo-500/30',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      link: '/control-proyectos',
      activo: true,
      adminLink: '/admin/control-proyectos-costo-hora',
      extraLinks: [
        { to: '/control-proyectos/reporte', label: 'Reporte BI' },
        { to: '/control-proyectos/reporte/proyectos', label: 'Vista proyectos' },
        { to: '/control-proyectos/reporte/actividades', label: 'Actividades / horas' }
      ]
    });
  }

  if (puedeAccederModuloPortal('solicitudes-registro')) {
    modulos.push({
      id: 'solicitudes-registro',
      titulo: 'Solicitudes de Registro',
      descripcion: 'Revisa y aprueba las solicitudes de nuevos usuarios',
      icono: UserPlusIcon,
      color: 'from-emerald-500 to-green-500',
      shadowColor: 'shadow-emerald-500/30',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/admin/solicitudes-registro',
      activo: true,
      restringido: true
    });
  }

  if (esAdminPortalUsuarios()) {
    modulos.push({
      id: 'admin-portal-usuarios',
      titulo: 'Administración de Usuarios',
      descripcion: 'Activa usuarios, restablece contraseñas y define acceso a módulos del portal',
      icono: UsersIcon,
      color: 'from-slate-600 to-slate-800',
      shadowColor: 'shadow-slate-500/30',
      bgLight: 'bg-slate-100',
      textColor: 'text-slate-700',
      link: '/admin-portal/usuarios',
      activo: true,
      restringido: true,
      soloAdminPersonal: true
    });
  }

  const modulosVisibles = modulos.filter((m) =>
    m.soloAdminPersonal ? true : puedeAccederModuloPortal(m.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 opacity-5"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-teal-500/30 p-2">
              <LogoTransparente src="/gestion-vacaciones/isotipo-prayaga.png" alt="Prayaga" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Portal Prayaga Interno
              </h1>
              <p className="text-slate-500 text-lg">PRAYAGA</p>
            </div>
          </div>
          
          <p className="text-slate-600 text-lg max-w-2xl">
            Bienvenido, <span className="font-semibold text-teal-600">{usuario?.nombres}</span>. 
            Selecciona el módulo al que deseas acceder.
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {modulosVisibles.map((modulo) => {
            const Icono = modulo.icono;
            
            if (modulo.proximamente) {
              return (
                <div
                  key={modulo.id}
                  className="relative group p-8 rounded-3xl bg-white/60 border-2 border-dashed border-slate-200 cursor-not-allowed"
                >
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                      Próximamente
                    </span>
                  </div>
                  
                  <div className={`w-14 h-14 rounded-2xl ${modulo.bgLight} flex items-center justify-center mb-6 opacity-50`}>
                    <Icono className={`w-7 h-7 ${modulo.textColor}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-400 mb-2">
                    {modulo.titulo}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {modulo.descripcion}
                  </p>
                </div>
              );
            }
            
            return (
              <div
                key={modulo.id}
                className={`relative group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                {/* Efecto de fondo al hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${modulo.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}></div>
                
                {modulo.restringido && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-600">
                      Acceso Restringido
                    </span>
                  </div>
                )}
                
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${modulo.color} flex items-center justify-center mb-6 shadow-lg ${modulo.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                  <Icono className="w-7 h-7 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900">
                  {modulo.titulo}
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  {modulo.descripcion}
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={modulo.link}
                    className={`flex items-center gap-2 ${modulo.textColor} font-medium text-sm hover:underline`}
                  >
                    <span>Acceder</span>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  {(modulo.extraLinks || []).map((el) => (
                    <Link
                      key={el.to}
                      to={el.to}
                      className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800 hover:underline"
                    >
                      {el.label}
                    </Link>
                  ))}
                  
                  {/* Botón de gestión: reintegros solo aprobador o admin */}
                  {modulo.adminLink &&
                    (modulo.id === 'reembolsos'
                      ? esAdmin() || esAprobadorReembolsos()
                      : modulo.id === 'caja-chica'
                        ? puedeAccederModuloPortal('caja-chica')
                        : modulo.id === 'control-proyectos'
                          ? esAdmin()
                          : esAdmin() || esContadora()) && (
                    <Link
                      to={modulo.adminLink}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                    >
                      <Cog6ToothIcon className="w-3.5 h-3.5" />
                      Gestionar
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-8 text-center">
        <p className="text-slate-400 text-sm">
          © 2026 PRAYAGA · Portal Prayaga Interno
        </p>
      </div>
    </div>
  );
};

export default Portal;
