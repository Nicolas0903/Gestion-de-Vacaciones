import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  BriefcaseIcon,
  BuildingStorefrontIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Portal = () => {
  const navigate = useNavigate();
  const {
    usuario,
    logout,
    puedeAccederModuloPortal,
    esAdmin,
    esContadora,
    esAprobadorReembolsos,
    esAdminPortalUsuarios
  } = useAuth();

  /* Módulo cuya card abrió el selector de sub-opciones (null = cerrado). */
  const [moduloSelector, setModuloSelector] = useState(null);

  /* Menú dropdown del chip de usuario (con opciones admin) */
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const menuUsuarioRef = useRef(null);

  useEffect(() => {
    if (!moduloSelector) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModuloSelector(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moduloSelector]);

  useEffect(() => {
    if (!menuUsuarioAbierto) return undefined;
    const onClickOutside = (e) => {
      if (menuUsuarioRef.current && !menuUsuarioRef.current.contains(e.target)) {
        setMenuUsuarioAbierto(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuUsuarioAbierto(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuUsuarioAbierto]);

  const handleLogout = () => {
    if (!window.confirm('¿Cerrar sesión?')) return;
    /* Limpiamos también el saludo cacheado del asistente IA para que el próximo
     * usuario que use este navegador no vea info ajena. */
    try {
      localStorage.removeItem('asistenteIa.saludo');
    } catch (_) {
      /* ignore */
    }
    logout();
    navigate('/login', { replace: true });
  };

  const inicialUsuario = (usuario?.nombres || '?').trim().charAt(0).toUpperCase();

  /* Card unificada Vacaciones + Permisos: visualmente es una sola entrada en
   * el portal, pero por dentro respeta los permisos individuales de cada
   * submódulo (`vacaciones` y `permisos`). El botón "Gestionar" sigue yendo
   * a /permisos/gestion para admin/contadora, igual que antes. */
  const subAccesoVacaciones = puedeAccederModuloPortal('vacaciones');
  const subAccesoPermisos = puedeAccederModuloPortal('permisos');

  const modulos = [];

  if (subAccesoVacaciones || subAccesoPermisos) {
    modulos.push({
      id: 'vacaciones-permisos',
      titulo: 'Vacaciones y Permisos',
      descripcion: 'Solicita y administra vacaciones, descansos médicos y permisos del personal',
      icono: CalendarDaysIcon,
      color: 'from-teal-500 to-amber-500',
      shadowColor: 'shadow-teal-500/30',
      bgLight: 'bg-teal-50',
      textColor: 'text-teal-600',
      activo: true,
      subAccesos: [
        subAccesoVacaciones && {
          id: 'vacaciones',
          label: 'Vacaciones',
          descripcion: 'Solicita y aprueba vacaciones del personal',
          to: '/vacaciones',
          icono: CalendarDaysIcon
        },
        subAccesoPermisos && {
          id: 'permisos',
          label: 'Permisos y Descansos',
          descripcion: 'Descansos médicos y permisos personales',
          to: '/permisos',
          icono: ClipboardDocumentCheckIcon
        }
      ].filter(Boolean)
      /* El botón "Gestionar" ya no vive en el portal para este módulo;
       * vive dentro de la página de "Mis Permisos y Descansos" para los
       * roles que pueden gestionar. */
    });
  }

  modulos.push({
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
  });

  /* Card unificada Reintegros + Rendiciones. Visualmente es una sola entrada
   * pero cada sub-acceso respeta su permiso individual y `Gestionar` se
   * agrega dentro de cada página, no en el portal. */
  const subAccesoReembolsos = puedeAccederModuloPortal('reembolsos');
  const subAccesoRendicion = puedeAccederModuloPortal('rendicion-presupuesto');

  if (subAccesoReembolsos || subAccesoRendicion) {
    modulos.push({
      id: 'reintegros-rendiciones',
      titulo: 'Reintegros y Rendiciones',
      descripcion: 'Solicita reintegros de gastos y registra rendiciones de presupuesto',
      icono: BanknotesIcon,
      color: 'from-sky-500 to-indigo-600',
      shadowColor: 'shadow-sky-500/30',
      bgLight: 'bg-sky-50',
      textColor: 'text-sky-600',
      activo: true,
      /* La etiqueta de "Acceso Restringido" solo tiene sentido si únicamente
       * el sub-módulo restringido (rendición) está disponible. */
      restringido: !subAccesoReembolsos && subAccesoRendicion,
      subAccesos: [
        subAccesoReembolsos && {
          id: 'reembolsos',
          label: 'Solicitud de Reintegro',
          descripcion: 'Reintegro de gastos personales (boletas, comprobantes)',
          to: '/reembolsos',
          icono: BanknotesIcon
        },
        subAccesoRendicion && {
          id: 'rendicion-presupuesto',
          label: 'Rendición de Presupuesto',
          descripcion: 'Rendición de gastos por área (acceso restringido)',
          to: '/rendicion-presupuesto',
          icono: BanknotesIcon
        }
      ].filter(Boolean)
    });
  }

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

  if (puedeAccederModuloPortal('caja-rendicion')) {
    modulos.push({
      id: 'caja-rendicion',
      titulo: 'Caja rendición presupuesto',
      descripcion: 'Rendiciones aprobadas del mes y registro de depósitos (fecha, monto, comprobante)',
      icono: BanknotesIcon,
      color: 'from-violet-500 to-purple-600',
      shadowColor: 'shadow-violet-500/30',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
      link: '/caja-rendicion',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('proveedores')) {
    modulos.push({
      id: 'proveedores',
      titulo: 'Gestión de Proveedores',
      descripcion: 'Lista de proveedores y evaluación/selección (puede registrar uno o varios ganadores)',
      icono: BuildingStorefrontIcon,
      color: 'from-cyan-600 to-teal-700',
      shadowColor: 'shadow-cyan-500/30',
      bgLight: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      link: '/proveedores',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('control-proyectos')) {
    modulos.push({
      id: 'control-proyectos',
      titulo: 'Bolsa de Horas',
      descripcion: 'Proyectos, bolsa de horas y registro de actividades por consultor',
      icono: BriefcaseIcon,
      color: 'from-indigo-500 to-violet-600',
      shadowColor: 'shadow-indigo-500/30',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      link: '/control-proyectos',
      activo: true,
      adminLink: '/admin/control-proyectos-costo-hora',
      extraLinks: [{ to: '/control-proyectos/reporte', label: 'Reportes' }]
    });
  }

  /* Las opciones administrativas "Solicitudes de Registro" y "Administración
   * de Usuarios" ya no son cards del portal; viven en el menú del usuario
   * (esquina superior derecha) como atajos rápidos. */
  const opcionesUsuario = [
    puedeAccederModuloPortal('solicitudes-registro') && {
      id: 'solicitudes-registro',
      label: 'Solicitudes de Registro',
      descripcion: 'Revisa y aprueba registros de nuevos usuarios',
      to: '/admin/solicitudes-registro',
      icono: UserPlusIcon,
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50'
    },
    esAdminPortalUsuarios() && {
      id: 'admin-portal-usuarios',
      label: 'Administración de Usuarios',
      descripcion: 'Activa cuentas, contraseñas y acceso a módulos',
      to: '/admin-portal/usuarios',
      icono: UsersIcon,
      textColor: 'text-slate-700',
      bgLight: 'bg-slate-100'
    }
  ].filter(Boolean);

  const modulosVisibles = modulos.filter((m) => {
    if (m.soloAdminPersonal) return true;
    /* Las cards con sub-accesos ya se filtran al construirlas
     * (solo se agregan si el usuario puede ver al menos un sub-módulo). */
    if (m.subAccesos) return m.subAccesos.length > 0;
    return puedeAccederModuloPortal(m.id);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="relative">
        {/* Decoración de fondo aislada con overflow-hidden para que el blob no
         * recorte elementos posicionados (como el menú del usuario). */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 opacity-5"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-teal-500/30 p-2">
                <LogoTransparente src="/isotipo-prayaga.png" alt="Prayaga" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Portal Prayaga Interno
                </h1>
                <p className="text-slate-500 text-lg">PRAYAGA</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <div className="relative" ref={menuUsuarioRef}>
                <button
                  type="button"
                  onClick={() => setMenuUsuarioAbierto((v) => !v)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={menuUsuarioAbierto}
                  title="Mi cuenta"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xs font-semibold flex items-center justify-center">
                    {inicialUsuario}
                  </div>
                  <div className="hidden sm:block leading-tight pr-1 text-left">
                    <div className="text-xs font-medium text-slate-800 max-w-[180px] truncate">
                      {usuario?.nombres} {usuario?.apellidos}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {usuario?.rol_nombre?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuUsuarioAbierto ? 'rotate-180' : ''}`}
                  />
                </button>

                {menuUsuarioAbierto && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-40"
                  >
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm font-semibold flex items-center justify-center">
                          {inicialUsuario}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 truncate">
                            {usuario?.nombres} {usuario?.apellidos}
                          </div>
                          <div className="text-xs text-slate-500 capitalize truncate">
                            {usuario?.rol_nombre?.replace(/_/g, ' ')}
                          </div>
                          {usuario?.email && (
                            <div className="text-[11px] text-slate-400 truncate">{usuario.email}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {opcionesUsuario.length > 0 && (
                      <div className="py-1.5">
                        {opcionesUsuario.map((opc) => {
                          const Ic = opc.icono;
                          return (
                            <Link
                              key={opc.id}
                              to={opc.to}
                              role="menuitem"
                              onClick={() => setMenuUsuarioAbierto(false)}
                              className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                            >
                              <div className={`w-9 h-9 rounded-lg ${opc.bgLight} flex items-center justify-center shrink-0`}>
                                <Ic className={`w-5 h-5 ${opc.textColor}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800">{opc.label}</p>
                                <p className="text-xs text-slate-500 leading-snug">{opc.descripcion}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    <div className={`${opcionesUsuario.length > 0 ? 'border-t border-slate-100' : ''} py-1.5`}>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuUsuarioAbierto(false);
                          handleLogout();
                        }}
                        role="menuitem"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            
            const tieneSubAccesos = !!modulo.subAccesos;
            const cardInteractiva = tieneSubAccesos;

            const cardClassName = `relative group p-8 rounded-3xl bg-white border border-slate-100 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
              cardInteractiva ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2' : ''
            }`;

            const abrirSelector = () => {
              if (!cardInteractiva) return;
              /* Si el usuario solo puede acceder a un sub-módulo, saltamos el
               * modal y navegamos directo. */
              if (modulo.subAccesos.length === 1) {
                navigate(modulo.subAccesos[0].to);
                return;
              }
              setModuloSelector(modulo);
            };
            const handleCardClick = () => abrirSelector();
            const handleCardKey = (e) => {
              if (!cardInteractiva) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                abrirSelector();
              }
            };

            return (
              <div
                key={modulo.id}
                className={cardClassName}
                role={cardInteractiva ? 'button' : undefined}
                tabIndex={cardInteractiva ? 0 : undefined}
                onClick={cardInteractiva ? handleCardClick : undefined}
                onKeyDown={cardInteractiva ? handleCardKey : undefined}
                aria-haspopup={cardInteractiva ? 'dialog' : undefined}
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
                
                <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {tieneSubAccesos ? (
                      <span className={`inline-flex items-center gap-2 ${modulo.textColor} font-medium text-sm`}>
                        <span>Elegir opción</span>
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    ) : (
                      <Link
                        to={modulo.link}
                        className={`flex items-center gap-2 ${modulo.textColor} font-medium text-sm hover:underline`}
                      >
                        <span>Acceder</span>
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    )}
                    {(modulo.extraLinks || []).map((el) => (
                      <Link
                        key={el.to}
                        to={el.to}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-sm font-medium ${modulo.textColor} hover:opacity-80 hover:underline`}
                      >
                        {el.label}
                      </Link>
                    ))}
                  </div>

                  {modulo.adminLink &&
                    (modulo.id === 'reembolsos'
                      ? esAdmin() || esAprobadorReembolsos()
                      : modulo.id === 'caja-chica'
                        ? puedeAccederModuloPortal('caja-chica')
                        : modulo.id === 'control-proyectos'
                          ? esAdmin()
                          : modulo.id === 'rendicion-presupuesto'
                            ? esAdmin()
                            : modulo.id === 'vacaciones-permisos'
                              ? esAdmin() || esContadora()
                              : esAdmin() || esContadora()) && (
                    <Link
                      to={modulo.adminLink}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors shrink-0"
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

      {/* Modal selector de sub-opciones (Vacaciones / Permisos, etc.) */}
      {moduloSelector && (() => {
        const SelectorIcono = moduloSelector.icono;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="selector-titulo"
            onClick={() => setModuloSelector(null)}
          >
            <div
              className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-8 sm:p-10 md:p-12 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModuloSelector(null)}
                className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${moduloSelector.color} flex items-center justify-center shadow-lg ${moduloSelector.shadowColor}`}>
                  <SelectorIcono className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 id="selector-titulo" className="text-2xl sm:text-3xl font-bold text-slate-800">
                    {moduloSelector.titulo}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 mt-1">¿A qué quieres acceder?</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {moduloSelector.subAccesos.map((sa) => {
                  const SubIcono = sa.icono;
                  return (
                    <button
                      key={sa.id}
                      type="button"
                      onClick={() => {
                        setModuloSelector(null);
                        navigate(sa.to);
                      }}
                      className="group flex flex-col items-start gap-4 p-6 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/40 hover:shadow-lg transition-all text-left min-h-[180px]"
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${moduloSelector.color} flex items-center justify-center shadow ${moduloSelector.shadowColor} group-hover:scale-110 transition-transform`}>
                        {SubIcono && <SubIcono className="w-7 h-7 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-lg mb-1">{sa.label}</p>
                        {sa.descripcion && (
                          <p className="text-sm text-slate-500 leading-snug">{sa.descripcion}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${moduloSelector.textColor}`}>
                        Acceder
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Portal;
