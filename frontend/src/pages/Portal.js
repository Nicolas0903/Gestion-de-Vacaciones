import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacionService } from '../services/api';
import LogoTransparente from '../components/LogoTransparente';
import NotificacionesDropdown from '../components/NotificacionesDropdown';
import CambiarPasswordModal from '../components/CambiarPasswordModal';
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChartBarSquareIcon,
  ServerStackIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  BanknotesIcon,
  WalletIcon,
  UsersIcon,
  BriefcaseIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  Squares2X2Icon,
  PowerIcon
} from '@heroicons/react/24/outline';

const AREAS_PORTAL = [
  {
    id: 'mi-espacio',
    titulo: 'Mi espacio',
    subtitulo: 'RRHH y documentos personales',
    navLabel: 'RRHH'
  },
  {
    id: 'operaciones',
    titulo: 'Operaciones y finanzas',
    subtitulo: 'Gastos, caja y proveedores',
    navLabel: 'Finanzas'
  },
  {
    id: 'proyectos',
    titulo: 'Proyectos y análisis',
    subtitulo: 'Horas, capacidad y consumo',
    navLabel: 'Proyectos'
  }
];

const SIDEBAR_NAV = [
  { id: 'inicio', label: 'Inicio', icono: HomeIcon },
  { id: 'mi-espacio', label: 'RRHH', icono: CalendarDaysIcon },
  { id: 'operaciones', label: 'Finanzas', icono: BanknotesIcon },
  { id: 'proveedores', label: 'Proveedores', icono: BuildingStorefrontIcon },
  { id: 'proyectos', label: 'Proyectos', icono: BriefcaseIcon },
  { id: 'analitica', label: 'Analítica', icono: ChartBarSquareIcon }
];

function puedeVerAdminLink(modulo, ctx) {
  const { esAdmin, esContadora, esAprobadorReembolsos, puedeAccederModuloPortal } = ctx;
  if (!modulo.adminLink) return false;
  if (modulo.id === 'reembolsos') return esAdmin() || esAprobadorReembolsos();
  if (modulo.id === 'caja-chica') return puedeAccederModuloPortal('caja-chica');
  if (modulo.id === 'control-proyectos') return esAdmin();
  if (modulo.id === 'rendicion-presupuesto') return esAdmin();
  if (modulo.id === 'vacaciones-permisos') return esAdmin() || esContadora();
  return esAdmin() || esContadora();
}

function destinoModulo(modulo, navigate, setModuloSelector) {
  if (modulo.subAccesos?.length) {
    if (modulo.subAccesos.length === 1) {
      navigate(modulo.subAccesos[0].to);
      return;
    }
    setModuloSelector(modulo);
    return;
  }
  if (modulo.link) navigate(modulo.link);
}

const Portal = () => {
  const navigate = useNavigate();
  const {
    usuario,
    logout,
    puedeAccederModuloPortal,
    refrescarUsuario,
    esAdmin,
    esContadora,
    esAprobadorReembolsos,
    esAdminPortalUsuarios
  } = useAuth();

  const [moduloSelector, setModuloSelector] = useState(null);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [navActiva, setNavActiva] = useState('inicio');
  const [notifCount, setNotifCount] = useState(0);

  const menuUsuarioRef = useRef(null);
  const refInicio = useRef(null);
  const refMiEspacio = useRef(null);
  const refOperaciones = useRef(null);
  const refProveedores = useRef(null);
  const refProyectos = useRef(null);
  const refModulosGrid = useRef(null);
  const refMenuPanel = useRef(null);
  const refSidebarConfig = useRef(null);

  useEffect(() => {
    refrescarUsuario();
  }, [refrescarUsuario]);

  useEffect(() => {
    notificacionService
      .contarNoLeidas()
      .then(({ data }) => setNotifCount(data?.data?.total || 0))
      .catch(() => setNotifCount(0));
  }, []);

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
      const inTrigger = menuUsuarioRef.current?.contains(e.target);
      const inPanel = refMenuPanel.current?.contains(e.target);
      const inSidebarConfig = refSidebarConfig.current?.contains(e.target);
      if (!inTrigger && !inPanel && !inSidebarConfig) {
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
    try {
      localStorage.removeItem('asistenteIa.saludo');
    } catch (_) {
      /* ignore */
    }
    logout();
    navigate('/login', { replace: true });
  };

  const inicialUsuario = (usuario?.nombres || '?').trim().charAt(0).toUpperCase();
  const ctxAdmin = { esAdmin, esContadora, esAprobadorReembolsos, puedeAccederModuloPortal };

  const subAccesoVacaciones = puedeAccederModuloPortal('vacaciones');
  const subAccesoPermisos = puedeAccederModuloPortal('permisos');
  const subAccesoReembolsos = puedeAccederModuloPortal('reembolsos');
  const subAccesoRendicion = puedeAccederModuloPortal('rendicion-presupuesto');
  const subAccesoCajaChica = puedeAccederModuloPortal('caja-chica');
  const subAccesoRendicionCaja = puedeAccederModuloPortal('caja-rendicion');

  const modulos = [];

  if (subAccesoVacaciones || subAccesoPermisos) {
    modulos.push({
      id: 'vacaciones-permisos',
      area: 'mi-espacio',
      titulo: 'Vacaciones y Permisos',
      descripcion: 'Solicita y administra vacaciones, descansos médicos y permisos del personal',
      metricHint: 'Solicitudes y calendario del personal',
      accionLabel: subAccesoVacaciones ? 'Nueva solicitud' : 'Ver permisos',
      accionTo: subAccesoVacaciones ? '/vacaciones/nueva-solicitud' : '/permisos',
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
    });
  }

  if (puedeAccederModuloPortal('boletas')) {
  modulos.push({
    id: 'boletas',
    area: 'mi-espacio',
    titulo: 'Boletas de Pago',
    descripcion: 'Visualiza y firma tus boletas de pago mensuales',
    metricHint: 'Documentos de remuneración',
    accionLabel: 'Ver y firmar',
    accionTo: '/boletas',
    icono: DocumentTextIcon,
    color: 'from-fuchsia-500 to-pink-600',
    shadowColor: 'shadow-fuchsia-500/30',
    bgLight: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-600',
    link: '/boletas',
    activo: true,
    adminLink: '/boletas/gestion'
  });
  }

  if (subAccesoReembolsos || subAccesoRendicion) {
    modulos.push({
      id: 'reintegros-rendiciones',
      area: 'operaciones',
      titulo: 'Reintegros y Rendiciones',
      descripcion: 'Solicita reintegros de gastos y registra rendiciones de presupuesto',
      metricHint: 'Gastos y rendiciones de presupuesto',
      accionLabel: 'Nueva solicitud',
      accionTo: subAccesoReembolsos ? '/reembolsos' : '/rendicion-presupuesto',
      icono: BanknotesIcon,
      color: 'from-sky-400 to-cyan-600',
      shadowColor: 'shadow-cyan-500/30',
      bgLight: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      activo: true,
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
      area: 'mi-espacio',
      titulo: 'Reporte de Asistencia',
      descripcion: 'Visualiza el reporte de asistencia del personal',
      metricHint: 'Control de asistencia del equipo',
      accionLabel: 'Ver reporte',
      accionTo: '/reporte-asistencia',
      icono: ChartBarSquareIcon,
      color: 'from-rose-500 to-red-600',
      shadowColor: 'shadow-rose-500/30',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      link: '/reporte-asistencia',
      activo: true,
      restringido: true
    });
  }

  if (subAccesoCajaChica || subAccesoRendicionCaja) {
    modulos.push({
      id: 'rendiciones-caja',
      area: 'operaciones',
      titulo: 'Rendiciones de caja',
      descripcion:
        'Reportes mensuales de caja chica y registro de depósitos de rendiciones de presupuesto',
      metricHint: 'Caja chica y depósitos del mes',
      accionLabel: 'Registrar',
      accionTo: subAccesoCajaChica ? '/caja-chica' : '/caja-rendicion',
      icono: WalletIcon,
      color: 'from-yellow-400 to-lime-600',
      shadowColor: 'shadow-yellow-500/30',
      bgLight: 'bg-yellow-50',
      textColor: 'text-lime-700',
      activo: true,
      restringido: true,
      subAccesos: [
        subAccesoCajaChica && {
          id: 'caja-chica',
          label: 'Rendición Caja Chica',
          descripcion: 'Ingresos manuales y egresos desde reintegros aprobados del mes',
          to: '/caja-chica',
          icono: WalletIcon
        },
        subAccesoRendicionCaja && {
          id: 'caja-rendicion',
          label: 'Rendición Presupuesto',
          descripcion: 'Rendiciones aprobadas del mes: depósito, monto y comprobante',
          to: '/caja-rendicion',
          icono: BanknotesIcon
        }
      ].filter(Boolean)
    });
  }

  if (puedeAccederModuloPortal('proveedores')) {
    modulos.push({
      id: 'proveedores',
      area: 'operaciones',
      titulo: 'Gestión de Proveedores',
      descripcion: 'Lista de proveedores y evaluación/selección (puede registrar uno o varios ganadores)',
      metricHint: 'Registro y evaluación de proveedores',
      accionLabel: 'Ver proveedores',
      accionTo: '/proveedores',
      icono: BuildingStorefrontIcon,
      color: 'from-orange-500 to-amber-600',
      shadowColor: 'shadow-orange-500/30',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/proveedores',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('comisiones-por-pagar')) {
    modulos.push({
      id: 'comisiones-por-pagar',
      area: 'proyectos',
      titulo: 'Comisiones por Pagar',
      descripcion: 'Seguimiento de comisiones por vendedor, cliente y cuotas de facturación',
      metricHint: 'Seguimiento de comisiones',
      accionLabel: 'Ver detalle',
      accionTo: '/comisiones-por-pagar',
      icono: CurrencyDollarIcon,
      color: 'from-emerald-600 to-teal-700',
      shadowColor: 'shadow-emerald-600/30',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      link: '/comisiones-por-pagar',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('consumo-fabric')) {
    modulos.push({
      id: 'consumo-fabric',
      area: 'proyectos',
      titulo: 'Consumo Fabric',
      descripcion: 'Reporte de uso Microsoft Fabric (PAYG) y monto mensual por cliente',
      metricHint: 'Seguimiento mensual de consumo',
      accionLabel: 'Ver detalle',
      accionTo: '/consumo-fabric',
      icono: ServerStackIcon,
      color: 'from-indigo-600 to-violet-700',
      shadowColor: 'shadow-indigo-600/30',
      bgLight: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      link: '/consumo-fabric',
      activo: true,
      restringido: true
    });
  }

  if (puedeAccederModuloPortal('control-proyectos')) {
    modulos.push({
      id: 'control-proyectos',
      area: 'proyectos',
      titulo: 'Bolsa de Horas',
      descripcion: 'Proyectos, bolsa de horas y registro de actividades por consultor',
      metricHint: 'Proyectos y registro de horas',
      accionLabel: 'Registrar actividad',
      accionTo: '/control-proyectos',
      icono: BriefcaseIcon,
      color: 'from-purple-800 to-fuchsia-700',
      shadowColor: 'shadow-purple-600/30',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-800',
      link: '/control-proyectos',
      activo: true,
      adminLink: '/admin/control-proyectos-costo-hora',
      extraLinks: [{ to: '/control-proyectos/reporte', label: 'Reportes' }]
    });
  }

  const opcionesUsuario = [
    puedeAccederModuloPortal('archivo-respaldos') && {
      id: 'archivo-respaldos',
      label: 'Archivo / Respaldos',
      descripcion: 'Copias diarias en Excel (08:30 y 17:30) y descarga de volcados SQL',
      to: '/archivo-respaldos',
      icono: ArchiveBoxIcon,
      textColor: 'text-slate-700',
      bgLight: 'bg-slate-50'
    },
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
    if (m.subAccesos) return m.subAccesos.length > 0;
    return puedeAccederModuloPortal(m.id);
  });

  const q = busqueda.trim().toLowerCase();
  const modulosFiltrados = useMemo(() => {
    if (!q) return modulosVisibles;
    return modulosVisibles.filter(
      (m) =>
        m.titulo.toLowerCase().includes(q) ||
        m.descripcion.toLowerCase().includes(q) ||
        (m.metricHint && m.metricHint.toLowerCase().includes(q))
    );
  }, [modulosVisibles, q]);

  const modulosPorArea = useMemo(() => {
    const map = {};
    AREAS_PORTAL.forEach((a) => {
      map[a.id] = modulosFiltrados.filter((m) => m.area === a.id);
    });
    return map;
  }, [modulosFiltrados]);

  const scrollToNav = (navId) => {
    setNavActiva(navId);
    const map = {
      inicio: refInicio,
      'mi-espacio': refMiEspacio,
      operaciones: refOperaciones,
      proveedores: refProveedores,
      proyectos: refProyectos,
      analitica: refProyectos
    };
    const el = map[navId]?.current;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navVisible = (itemId) => {
    if (itemId === 'inicio') return true;
    if (itemId === 'proveedores') return !!modulosPorArea.operaciones?.some((m) => m.id === 'proveedores');
    if (itemId === 'analitica') {
      return !!modulosPorArea.proyectos?.some((m) =>
        ['consumo-fabric', 'comisiones-por-pagar'].includes(m.id)
      );
    }
    const areaMap = { 'mi-espacio': 'mi-espacio', operaciones: 'operaciones', proyectos: 'proyectos' };
    const areaId = areaMap[itemId];
    return areaId ? (modulosPorArea[areaId]?.length || 0) > 0 : false;
  };

  const renderMenuCuenta = () => (
    <div
      ref={refMenuPanel}
      role="menu"
      className="fixed right-4 top-[4.25rem] w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50"
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
            {usuario?.email && <div className="text-[11px] text-slate-400 truncate">{usuario.email}</div>}
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
            setModalPasswordAbierto(true);
          }}
          role="menuitem"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <KeyIcon className="w-5 h-5 text-teal-600" />
          Cambiar contraseña
        </button>
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
  );

  const renderModuloFila = (modulo) => {
    const Icono = modulo.icono;
    const abrir = () => destinoModulo(modulo, navigate, setModuloSelector);

    return (
      <div
        key={modulo.id}
        id={modulo.id === 'proveedores' ? 'modulo-proveedores' : undefined}
        className="group"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={abrir}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              abrir();
            }
          }}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100/80 shadow-sm hover:shadow-md hover:border-slate-200 transition-all text-left cursor-pointer"
        >
          <div
            className={`w-11 h-11 rounded-lg bg-gradient-to-br ${modulo.color} flex items-center justify-center shadow-sm ${modulo.shadowColor} shrink-0`}
          >
            <Icono className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-[15px]">{modulo.titulo}</h3>
              {modulo.restringido && (
                <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-rose-50 text-rose-600">
                  Restringido
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{modulo.metricHint || modulo.descripcion}</p>
            {modulo.accionTo ? (
              <Link
                to={modulo.accionTo}
                onClick={(e) => e.stopPropagation()}
                className={`inline-block mt-2 text-sm font-semibold ${modulo.textColor} hover:underline`}
              >
                {modulo.accionLabel || 'Acceder'}
              </Link>
            ) : (
              <span className={`inline-block mt-2 text-sm font-semibold ${modulo.textColor}`}>
                {modulo.accionLabel || 'Acceder'}
              </span>
            )}
          </div>

          <ChevronRightIcon className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
        </div>

        {(modulo.extraLinks?.length > 0 || puedeVerAdminLink(modulo, ctxAdmin)) && (
          <div className="flex flex-wrap gap-3 px-4 pb-1 -mt-1">
            {(modulo.extraLinks || []).map((el) => (
              <Link
                key={el.to}
                to={el.to}
                className={`text-xs font-medium ${modulo.textColor} hover:underline`}
              >
                {el.label}
              </Link>
            ))}
            {puedeVerAdminLink(modulo, ctxAdmin) && (
              <Link
                to={modulo.adminLink}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                <Cog6ToothIcon className="w-3 h-3" />
                Gestionar
              </Link>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex">
      {/* Sidebar — mockup */}
      <aside className="hidden lg:flex flex-col w-[220px] xl:w-[240px] shrink-0 bg-white border-r border-slate-200/80 min-h-screen sticky top-0">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <LogoTransparente src="/isotipo-prayaga.png" alt="Prayaga" className="h-9 w-9 object-contain shrink-0" />
            <span className="text-xl font-semibold text-teal-600 tracking-tight lowercase">prayaga</span>
          </div>
        </div>

        <p className="px-5 text-[11px] font-medium text-slate-400 mb-2">Portal interno</p>

        <nav className="flex-1 px-2 space-y-0.5">
          {SIDEBAR_NAV.map((item) => {
            const NavIcon = item.icono;
            const activo = navActiva === item.id;
            if (!navVisible(item.id)) return null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToNav(item.id)}
                className={`w-full flex items-center gap-3 py-2.5 pr-3 text-sm font-medium transition-colors rounded-r-lg ${
                  activo
                    ? 'bg-teal-50 text-teal-700 border-l-[3px] border-teal-500 pl-[9px]'
                    : 'text-slate-600 hover:bg-slate-50 border-l-[3px] border-transparent pl-3'
                }`}
              >
                <NavIcon className="w-[18px] h-[18px] shrink-0 opacity-80" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-2 py-5 mt-auto border-t border-slate-100">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Cuenta</p>
          {esAdminPortalUsuarios() ? (
            <Link
              to="/admin-portal/usuarios"
              className="w-full flex items-center gap-3 py-2.5 pl-3 pr-3 rounded-r-lg text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-[3px] border-transparent"
            >
              <Cog6ToothIcon className="w-[18px] h-[18px]" />
              Configuración
            </Link>
          ) : (
            <button
              ref={refSidebarConfig}
              type="button"
              onClick={() => setMenuUsuarioAbierto(true)}
              className="w-full flex items-center gap-3 py-2.5 pl-3 pr-3 rounded-r-lg text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-[3px] border-transparent"
            >
              <Cog6ToothIcon className="w-[18px] h-[18px]" />
              Configuración
            </button>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — mockup */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-4 max-w-[1400px] mx-auto">
            <div className="lg:hidden flex items-center gap-2 shrink-0">
              <LogoTransparente src="/isotipo-prayaga.png" alt="Prayaga" className="h-8 w-8" />
              <span className="text-lg font-semibold text-teal-600 lowercase">prayaga</span>
            </div>

            <div className="flex-1 flex justify-center min-w-0">
              <div className="relative w-full max-w-xl">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en el portal..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificacionesDropdown />

              <div className="relative" ref={menuUsuarioRef}>
                <button
                  type="button"
                  onClick={() => setMenuUsuarioAbierto((v) => !v)}
                  className="flex items-center gap-2.5 pl-1 pr-1 py-1 rounded-full hover:bg-slate-50 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={menuUsuarioAbierto}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-semibold flex items-center justify-center shadow-sm">
                    {inicialUsuario}
                  </div>
                  <div className="leading-tight text-left max-w-[160px] hidden md:block">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {usuario?.nombres} {usuario?.apellidos}
                    </div>
                    <div className="text-xs text-slate-400 capitalize truncate">
                      {usuario?.rol_nombre?.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 transition-transform hidden md:block ${menuUsuarioAbierto ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Cerrar sesión"
              >
                <PowerIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          {/* Encabezado — mockup Concepto B */}
          <section ref={refInicio} className="mb-6 scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-[1.75rem] font-bold text-slate-900 tracking-tight">
                  Hola, {usuario?.nombres}
                </h1>
                <p className="text-slate-500 mt-1 text-[15px]">Tu portal organizado por áreas de trabajo.</p>
              </div>
              {notifCount > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-sm font-medium shrink-0">
                  <span>
                    {notifCount} {notifCount === 1 ? 'notificación necesita' : 'notificaciones necesitan'} revisión
                  </span>
                  <ChevronRightIcon className="w-4 h-4 opacity-70" />
                </div>
              )}
            </div>
          </section>

          {/* Módulos por área — paneles azul claro como mockup */}
          {modulosFiltrados.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-10 text-center shadow-sm">
              <Squares2X2Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No hay módulos que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <div ref={refModulosGrid} className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 scroll-mt-24">
              {AREAS_PORTAL.map((area) => {
                const items = modulosPorArea[area.id] || [];
                if (!items.length) return null;

                const refMap = {
                  'mi-espacio': refMiEspacio,
                  operaciones: refOperaciones,
                  proyectos: refProyectos
                };

                return (
                  <section
                    key={area.id}
                    ref={refMap[area.id]}
                    className="scroll-mt-24 rounded-2xl bg-[#e8f2f8] border border-sky-100/60 p-4 sm:p-5"
                  >
                    <div className="mb-4">
                      <h2 className="text-base font-bold text-slate-800">{area.titulo}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{area.subtitulo}</p>
                    </div>
                    <div className="space-y-3">
                      {items.map((modulo) => {
                        if (modulo.id === 'proveedores') {
                          return (
                            <div key={modulo.id} ref={refProveedores} className="scroll-mt-24">
                              {renderModuloFila(modulo)}
                            </div>
                          );
                        }
                        return renderModuloFila(modulo);
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {modulosVisibles.length > 0 && (
            <div className="mt-8 flex justify-start">
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  refModulosGrid.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Catálogo completo de módulos
              </button>
            </div>
          )}

          <p className="text-center text-slate-400 text-xs mt-10 pb-4">© 2026 PRAYAGA · Portal Prayaga Interno</p>
        </main>
      </div>

      {menuUsuarioAbierto && renderMenuCuenta()}

      {/* Modal selector de sub-opciones */}
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
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${moduloSelector.color} flex items-center justify-center shadow-lg ${moduloSelector.shadowColor}`}
                >
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
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${moduloSelector.color} flex items-center justify-center shadow ${moduloSelector.shadowColor} group-hover:scale-110 transition-transform`}
                      >
                        {SubIcono && <SubIcono className="w-7 h-7 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-lg mb-1">{sa.label}</p>
                        {sa.descripcion && (
                          <p className="text-sm text-slate-500 leading-snug">{sa.descripcion}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${moduloSelector.textColor}`}
                      >
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

      <CambiarPasswordModal open={modalPasswordAbierto} onClose={() => setModalPasswordAbierto(false)} />
    </div>
  );
};

export default Portal;
