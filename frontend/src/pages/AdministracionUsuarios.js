import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { differenceInDays } from 'date-fns';
import {
  UserPlusIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  NoSymbolIcon,
  ArrowLeftIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { adminPortalUsuariosService, solicitudService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parseFechaSegura, formatoFechaDMY } from '../utils/dateUtils';

const DETALLE_TABS = [
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'acceso', label: 'Acceso a la plataforma' },
  { id: 'vacaciones', label: 'Vacaciones ganadas' }
];

function badgeClaseVacacion(estado) {
  switch (estado) {
    case 'gozadas':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'parcial':
      return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
    case 'pendiente':
      return 'bg-sky-500/15 text-sky-200 border-sky-500/35';
    default:
      return 'bg-white/10 text-gray-300 border-white/15';
  }
}

function etiquetaVacacionEstado(estado) {
  switch (estado) {
    case 'gozadas':
      return 'Gozadas';
    case 'parcial':
      return 'Parcial';
    case 'pendiente':
      return 'Pendiente';
    default:
      return estado || '—';
  }
}

const cx = (...parts) => parts.filter(Boolean).join(' ');

function mapaModulosDesdeAccesoDetalle(detalle) {
  const m = {};
  (detalle || []).forEach((x) => {
    m[x.id] = !!x.activo;
  });
  return m;
}

function aplicarModulosEditorADraft(modulos_editor) {
  const draft = {};
  (modulos_editor || []).forEach((mod) => {
    draft[mod.id] = !!mod.asignado;
  });
  return draft;
}

function iniciales(nombres, apellidos) {
  const a = (nombres || '').trim().charAt(0) || '';
  const b = (apellidos || '').trim().charAt(0) || '';
  return (a + b).toUpperCase() || '?';
}

/** Prefijo de código según nombre de rol en BD (ampliable). */
function prefijoCodigoPorNombreRol(nombreRol) {
  const n = (nombreRol || '').toLowerCase().trim();
  if (n === 'admin' || n.includes('administr')) return 'ADM';
  if (n.includes('contador')) return 'CON';
  if (n.includes('jefe')) return 'JOP';
  if (n.includes('practic')) return 'PRA';
  if (n.includes('empleado')) return 'EMP';
  const slug = n.replace(/[^a-z0-9]/gi, '').slice(0, 3);
  return slug.toUpperCase() || 'EMP';
}

function siguienteCodigoConPrefijo(prefijo, codigosExistentes) {
  const p = (prefijo || 'EMP').toUpperCase().slice(0, 8);
  const re = new RegExp(`^${p}(\\d+)$`, 'i');
  let max = 0;
  for (const raw of codigosExistentes || []) {
    const c = (raw || '').trim();
    const m = c.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = max + 1;
  const suf = n < 10000 ? String(n).padStart(3, '0') : String(n);
  return `${p}${suf}`.slice(0, 20);
}

export default function AdministracionUsuarios() {
  const { usuario } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [drawerId, setDrawerId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [tabDetalle, setTabDetalle] = useState('cuenta');
  const [modulosDraft, setModulosDraft] = useState({});
  const [guardandoModulos, setGuardandoModulos] = useState(false);
  const [accesoExpandido, setAccesoExpandido] = useState(true);
  const [moduloTagBusy, setModuloTagBusy] = useState(null);

  const [vacResumen, setVacResumen] = useState(null);
  const [vacPeriodos, setVacPeriodos] = useState([]);
  const [vacCargando, setVacCargando] = useState(false);
  const [vacError, setVacError] = useState(null);

  const [modalSalidas, setModalSalidas] = useState(false);
  const [periodoSalidas, setPeriodoSalidas] = useState(null);
  const [listaSalidas, setListaSalidas] = useState([]);
  const [salidasCargando, setSalidasCargando] = useState(false);

  const [modalAlta, setModalAlta] = useState(false);
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [formCuenta, setFormCuenta] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    dni: '',
    cargo: '',
    fecha_ingreso: '',
    codigo_empleado: '',
    rol_id: ''
  });
  const [roles, setRoles] = useState([]);
  const [formAlta, setFormAlta] = useState({
    codigo_empleado: '',
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    password: '',
    cargo: '',
    fecha_ingreso: '',
    rol_id: ''
  });
  const [codigosCatalogoAlta, setCodigosCatalogoAlta] = useState([]);
  const ultimoCodigoSugeridoAltaRef = useRef('');
  const prevRolAltaRef = useRef('');

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 320);
    return () => clearTimeout(t);
  }, [busqueda]);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const res = await adminPortalUsuariosService.listarEmpleados({
        busqueda: busquedaDeb || undefined
      });
      setEmpleados(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo cargar la lista');
    } finally {
      setCargandoLista(false);
    }
  }, [busquedaDeb]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    adminPortalUsuariosService
      .roles()
      .then((r) => setRoles(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!modalAlta) return;
    adminPortalUsuariosService
      .listarEmpleados({})
      .then((r) => setCodigosCatalogoAlta((r.data.data || []).map((e) => e.codigo_empleado)))
      .catch(() => setCodigosCatalogoAlta([]));
  }, [modalAlta]);

  const sugerirCodigoParaRolAlta = useCallback(
    (rolIdStr) => {
      const r = roles.find((x) => String(x.id) === String(rolIdStr));
      const pref = prefijoCodigoPorNombreRol(r?.nombre);
      return siguienteCodigoConPrefijo(pref, codigosCatalogoAlta);
    },
    [roles, codigosCatalogoAlta]
  );

  useEffect(() => {
    if (!modalAlta || !formAlta.rol_id) return;
    const sugerido = sugerirCodigoParaRolAlta(formAlta.rol_id);
    if (prevRolAltaRef.current !== formAlta.rol_id) {
      prevRolAltaRef.current = formAlta.rol_id;
      ultimoCodigoSugeridoAltaRef.current = sugerido;
      setFormAlta((f) =>
        f.codigo_empleado === sugerido ? f : { ...f, codigo_empleado: sugerido }
      );
      return;
    }
    const cod = (formAlta.codigo_empleado || '').trim();
    if (!cod || cod === ultimoCodigoSugeridoAltaRef.current) {
      ultimoCodigoSugeridoAltaRef.current = sugerido;
      setFormAlta((f) =>
        f.codigo_empleado === sugerido ? f : { ...f, codigo_empleado: sugerido }
      );
    }
  }, [modalAlta, formAlta.rol_id, formAlta.codigo_empleado, codigosCatalogoAlta, sugerirCodigoParaRolAlta]);

  useEffect(() => {
    if (tabDetalle !== 'vacaciones' || drawerId == null || !detalle?.empleado) return;
    let cancel = false;
    (async () => {
      setVacCargando(true);
      setVacError(null);
      try {
        const res = await adminPortalUsuariosService.vacacionesEmpleado(drawerId);
        const payload = res.data.data || {};
        if (!cancel) {
          setVacPeriodos(Array.isArray(payload.periodos) ? payload.periodos : []);
          setVacResumen(payload.resumen || null);
        }
      } catch (e) {
        if (!cancel) {
          setVacError(e.response?.data?.mensaje || 'No se pudieron cargar las vacaciones');
          setVacPeriodos([]);
          setVacResumen(null);
        }
      } finally {
        if (!cancel) setVacCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [tabDetalle, drawerId, detalle?.empleado?.id]);

  const abrirDetalle = async (id) => {
    setDrawerId(id);
    setTabDetalle('cuenta');
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      const res = await adminPortalUsuariosService.obtener(id);
      const { empleado, modulos_editor } = res.data.data;
      setDetalle({ empleado, modulos_editor });
      setModulosDraft(aplicarModulosEditorADraft(modulos_editor));
      setFormCuenta({
        nombres: empleado.nombres || '',
        apellidos: empleado.apellidos || '',
        email: empleado.email || '',
        dni: empleado.dni || '',
        cargo: empleado.cargo || '',
        fecha_ingreso: (empleado.fecha_ingreso || '').slice(0, 10),
        codigo_empleado: empleado.codigo_empleado || '',
        rol_id: empleado.rol_id != null ? String(empleado.rol_id) : ''
      });
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo cargar el usuario');
      setDrawerId(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirSalidasVacacion = async (periodo) => {
    setPeriodoSalidas(periodo);
    setModalSalidas(true);
    setSalidasCargando(true);
    setListaSalidas([]);
    try {
      const res = await solicitudService.salidasPorPeriodo(periodo.id);
      setListaSalidas(res.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudieron cargar las salidas');
      setListaSalidas([]);
    } finally {
      setSalidasCargando(false);
    }
  };

  const cerrarSalidasVacacion = () => {
    setModalSalidas(false);
    setPeriodoSalidas(null);
    setListaSalidas([]);
  };

  const cerrarDrawer = () => {
    setDrawerId(null);
    setDetalle(null);
    setVacResumen(null);
    setVacPeriodos([]);
    setVacError(null);
    setVacCargando(false);
    cerrarSalidasVacacion();
  };

  const idsSeleccionados = useMemo(() => [...seleccion], [seleccion]);

  const toggleSel = (id) => {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleTodos = () => {
    if (seleccion.size === empleados.length) setSeleccion(new Set());
    else setSeleccion(new Set(empleados.map((e) => e.id)));
  };

  const eliminarSeleccionados = async () => {
    if (!idsSeleccionados.length) {
      toast.error('Selecciona al menos un usuario');
      return;
    }
    const targets = idsSeleccionados.filter((id) => id !== usuario?.id);
    if (!targets.length) {
      toast.error('No puedes eliminar tu propia cuenta');
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar DEFINITIVAMENTE ${targets.length} usuario(s) de la base de datos?\n\nEsta acción no se puede deshacer. Se borrarán los datos vinculados que el sistema permita eliminar automáticamente.`
      )
    ) {
      return;
    }
    try {
      for (const id of targets) {
        await adminPortalUsuariosService.eliminarPermanente(id);
      }
      toast.success('Usuario(s) eliminado(s)');
      setSeleccion(new Set());
      cerrarDrawer();
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  const restablecerSeleccionados = async () => {
    if (idsSeleccionados.length !== 1) {
      toast.error('Selecciona un solo usuario para restablecer contraseña');
      return;
    }
    const id = idsSeleccionados[0];
    const pwd = window.prompt('Nueva contraseña (mín. 6 caracteres):');
    if (!pwd || pwd.length < 6) {
      toast.error('Contraseña inválida');
      return;
    }
    try {
      await adminPortalUsuariosService.restablecerPassword(id, pwd);
      toast.success('Contraseña actualizada');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al restablecer');
    }
  };

  const restablecerEnPanel = async () => {
    if (!detalle?.empleado) return;
    const pwd = window.prompt('Nueva contraseña (mín. 6 caracteres):');
    if (!pwd || pwd.length < 6) {
      toast.error('Contraseña inválida');
      return;
    }
    try {
      await adminPortalUsuariosService.restablecerPassword(detalle.empleado.id, pwd);
      toast.success('Contraseña actualizada');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al restablecer');
    }
  };

  const bloquearEnPanel = async () => {
    if (!detalle?.empleado) return;
    if (detalle.empleado.id === usuario?.id) {
      toast.error('No puedes bloquear tu propia cuenta');
      return;
    }
    if (!window.confirm('¿Desactivar este usuario?')) return;
    try {
      await adminPortalUsuariosService.bloquear(detalle.empleado.id);
      toast.success('Usuario desactivado');
      cerrarDrawer();
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error');
    }
  };

  const eliminarEnPanel = async () => {
    if (!detalle?.empleado) return;
    if (detalle.empleado.id === usuario?.id) {
      toast.error('No puedes eliminar tu propia cuenta');
      return;
    }
    const nombre = `${detalle.empleado.nombres || ''} ${detalle.empleado.apellidos || ''}`.trim();
    if (
      !window.confirm(
        `¿Eliminar DEFINITIVAMENTE a ${nombre || 'este usuario'} de la base de datos?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await adminPortalUsuariosService.eliminarPermanente(detalle.empleado.id);
      toast.success('Usuario eliminado');
      cerrarDrawer();
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  const guardarModulos = async () => {
    if (!detalle?.empleado) return;
    setGuardandoModulos(true);
    try {
      await adminPortalUsuariosService.actualizarModulos(detalle.empleado.id, modulosDraft);
      toast.success('Acceso guardado');
      const res = await adminPortalUsuariosService.obtener(detalle.empleado.id);
      const payload = res.data.data;
      setDetalle(payload);
      setModulosDraft(aplicarModulosEditorADraft(payload.modulos_editor));
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo guardar');
    } finally {
      setGuardandoModulos(false);
    }
  };

  const guardarCuenta = async (e) => {
    e.preventDefault();
    if (!detalle?.empleado) return;
    setGuardandoCuenta(true);
    try {
      await adminPortalUsuariosService.actualizarCuenta(detalle.empleado.id, {
        nombres: formCuenta.nombres,
        apellidos: formCuenta.apellidos,
        email: formCuenta.email,
        dni: formCuenta.dni,
        cargo: formCuenta.cargo,
        fecha_ingreso: formCuenta.fecha_ingreso,
        codigo_empleado: formCuenta.codigo_empleado,
        rol_id: formCuenta.rol_id ? parseInt(formCuenta.rol_id, 10) : undefined
      });
      toast.success('Cuenta actualizada');
      const res = await adminPortalUsuariosService.obtener(detalle.empleado.id);
      const payload = res.data.data;
      setDetalle(payload);
      const em = payload.empleado;
      setFormCuenta({
        nombres: em.nombres || '',
        apellidos: em.apellidos || '',
        email: em.email || '',
        dni: em.dni || '',
        cargo: em.cargo || '',
        fecha_ingreso: (em.fecha_ingreso || '').slice(0, 10),
        codigo_empleado: em.codigo_empleado || '',
        rol_id: em.rol_id != null ? String(em.rol_id) : ''
      });
      setModulosDraft(aplicarModulosEditorADraft(payload.modulos_editor));
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar la cuenta');
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...formAlta,
        rol_id: parseInt(formAlta.rol_id, 10),
        jefe_id: null
      };
      await adminPortalUsuariosService.crear(body);
      toast.success('Usuario creado');
      setModalAlta(false);
      prevRolAltaRef.current = '';
      ultimoCodigoSugeridoAltaRef.current = '';
      setFormAlta({
        codigo_empleado: '',
        nombres: '',
        apellidos: '',
        dni: '',
        email: '',
        password: '',
        cargo: '',
        fecha_ingreso: '',
        rol_id: ''
      });
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo crear');
    }
  };

  const cuentaActivos = useMemo(() => {
    return Object.values(modulosDraft).filter(Boolean).length;
  }, [modulosDraft]);

  const codigoSugeridoAltaVista = useMemo(() => {
    if (!formAlta.rol_id) return '';
    return sugerirCodigoParaRolAlta(formAlta.rol_id);
  }, [formAlta.rol_id, sugerirCodigoParaRolAlta]);

  const abrirModalAlta = () => {
    prevRolAltaRef.current = '';
    ultimoCodigoSugeridoAltaRef.current = '';
    setFormAlta({
      codigo_empleado: '',
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      password: '',
      cargo: '',
      fecha_ingreso: '',
      rol_id: ''
    });
    setModalAlta(true);
  };

  const aplicarSugerenciaCodigoAlta = () => {
    if (!formAlta.rol_id) {
      toast.error('Elige un rol primero');
      return;
    }
    const sugerido = sugerirCodigoParaRolAlta(formAlta.rol_id);
    ultimoCodigoSugeridoAltaRef.current = sugerido;
    setFormAlta((f) => ({ ...f, codigo_empleado: sugerido }));
  };

  const toggleModuloEnFila = async (row, moduloId, e) => {
    e.stopPropagation();
    const busyKey = `${row.id}-${moduloId}`;
    setModuloTagBusy(busyKey);
    try {
      const map = { ...mapaModulosDesdeAccesoDetalle(row.acceso_portal_detalle) };
      map[moduloId] = !map[moduloId];
      await adminPortalUsuariosService.actualizarModulos(row.id, map);
      toast.success('Acceso actualizado');
      await cargarLista();
      if (drawerId === row.id && detalle?.empleado?.id === row.id) {
        const res = await adminPortalUsuariosService.obtener(row.id);
        const payload = res.data.data;
        setDetalle(payload);
        setModulosDraft(aplicarModulosEditorADraft(payload.modulos_editor));
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo actualizar el acceso');
    } finally {
      setModuloTagBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1b1a] text-gray-100">
      <header className="border-b border-white/10 bg-[#252423]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Portal
          </Link>
          <h1 className="text-xl font-semibold text-white">Administración de Usuarios</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Usuarios activos</h2>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            type="button"
            onClick={abrirModalAlta}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-white/20 bg-white/5 hover:bg-white/10 text-sm"
          >
            <UserPlusIcon className="w-4 h-4" />
            Agregar usuario
          </button>
          <button
            type="button"
            onClick={eliminarSeleccionados}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-white/20 bg-white/5 hover:bg-white/10 text-sm text-red-300"
          >
            <TrashIcon className="w-4 h-4" />
            Eliminar usuario
          </button>
          <button
            type="button"
            onClick={restablecerSeleccionados}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border border-white/20 bg-white/5 hover:bg-white/10 text-sm"
          >
            <KeyIcon className="w-4 h-4" />
            Restablecer contraseña
          </button>

          <div className="ml-auto relative min-w-[240px] max-w-md flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              placeholder="Buscar por nombre, correo, DNI o código…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded bg-[#2d2c2b] border border-white/15 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 overflow-hidden bg-[#252423]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-gray-400">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={empleados.length > 0 && seleccion.size === empleados.length}
                      onChange={toggleTodos}
                      className="rounded border-gray-500"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Nombre</th>
                  <th className="px-3 py-3 font-medium">Correo</th>
                  <th className="px-3 py-3 font-medium">Acceso a la plataforma</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {cargandoLista ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-gray-500">
                      Cargando…
                    </td>
                  </tr>
                ) : empleados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-gray-500">
                      No hay resultados
                    </td>
                  </tr>
                ) : (
                  empleados.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer"
                      onClick={() => abrirDetalle(row.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={seleccion.has(row.id)}
                          onChange={() => toggleSel(row.id)}
                          className="rounded border-gray-500"
                        />
                      </td>
                      <td className="px-3 py-3 text-white font-medium">
                        {row.nombres} {row.apellidos}
                      </td>
                      <td className="px-3 py-3 text-gray-300">{row.email}</td>
                      <td className="px-3 py-3 text-gray-300 max-w-xl">
                        <div className="flex flex-wrap gap-1">
                          {(row.acceso_portal_detalle || []).map((x) => {
                            const busy = moduloTagBusy === `${row.id}-${x.id}`;
                            return (
                              <button
                                key={x.id}
                                type="button"
                                disabled={busy}
                                title={x.activo ? 'Quitar acceso (clic)' : 'Dar acceso (clic)'}
                                onClick={(e) => toggleModuloEnFila(row, x.id, e)}
                                className={cx(
                                  'text-xs px-2 py-0.5 rounded border text-left transition-opacity',
                                  busy && 'opacity-50 cursor-wait',
                                  !busy && 'hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-violet-500/60',
                                  x.activo
                                    ? 'bg-violet-500/20 text-violet-200 border-violet-500/35'
                                    : 'bg-white/[0.04] text-gray-500 border-white/5'
                                )}
                              >
                                {x.etiqueta}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cx(
                            'text-xs px-2 py-0.5 rounded-full',
                            row.activo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          )}
                        >
                          {row.activo ? 'Activo' : 'Bloqueado'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Drawer */}
      {drawerId != null && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar panel"
            onClick={cerrarDrawer}
          />
          <aside
            className={cx(
              'relative z-50 w-full h-full bg-[#252423] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden',
              tabDetalle === 'vacaciones' ? 'max-w-2xl' : 'max-w-lg'
            )}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
              <div className="flex gap-4 min-w-0">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-semibold shrink-0">
                  {detalle?.empleado
                    ? iniciales(detalle.empleado.nombres, detalle.empleado.apellidos)
                    : '…'}
                </div>
                <div className="min-w-0">
                  {cargandoDetalle ? (
                    <p className="text-gray-400">Cargando…</p>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-white truncate">
                        {detalle?.empleado?.nombres} {detalle?.empleado?.apellidos}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={restablecerEnPanel}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                          <KeyIcon className="w-3.5 h-3.5" />
                          Restablecer contraseña
                        </button>
                        <button
                          type="button"
                          onClick={bloquearEnPanel}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                          <NoSymbolIcon className="w-3.5 h-3.5" />
                          Bloquear inicio de sesión
                        </button>
                        <button
                          type="button"
                          onClick={eliminarEnPanel}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          Eliminar usuario
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarDrawer}
                className="p-1 rounded hover:bg-white/10 text-gray-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-white/10 px-5 gap-4 sm:gap-6 text-sm overflow-x-auto">
              {DETALLE_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTabDetalle(id)}
                  className={cx(
                    'py-3 border-b-2 -mb-px whitespace-nowrap shrink-0',
                    tabDetalle === id
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!detalle?.empleado ? null : tabDetalle === 'cuenta' ? (
                <form onSubmit={guardarCuenta} className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Nombres
                    </label>
                    <input
                      required
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.nombres}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, nombres: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Apellidos
                    </label>
                    <input
                      required
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.apellidos}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, apellidos: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Correo
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.email}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Rol
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.rol_id}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, rol_id: e.target.value }))}
                    >
                      <option value="">Seleccionar…</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Código empleado
                    </label>
                    <input
                      required
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.codigo_empleado}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, codigo_empleado: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      DNI
                    </label>
                    <input
                      required
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.dni}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, dni: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Cargo
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      placeholder="Opcional"
                      value={formCuenta.cargo}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, cargo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                      Fecha de ingreso
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                      value={formCuenta.fecha_ingreso}
                      onChange={(e) => setFormCuenta((f) => ({ ...f, fecha_ingreso: e.target.value }))}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Estado
                    </div>
                    <div className="text-white">
                      {detalle.empleado.activo ? 'Activo' : 'Bloqueado'}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={guardandoCuenta}
                    className="mt-2 py-2.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {guardandoCuenta ? 'Guardando…' : 'Guardar cambios de cuenta'}
                  </button>
                </form>
              ) : tabDetalle === 'acceso' ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setAccesoExpandido((v) => !v)}
                    className="w-full flex items-center justify-between py-2 text-left font-semibold text-white"
                  >
                    <span>
                      Acceso a la plataforma ({cuentaActivos})
                    </span>
                    <ChevronUpIcon
                      className={cx('w-5 h-5 transition-transform', !accesoExpandido && 'rotate-180')}
                    />
                  </button>
                  {accesoExpandido && (
                    <ul className="mt-2 space-y-3">
                      {(detalle.modulos_editor || []).map((m) => {
                        const on = !!modulosDraft[m.id];
                        return (
                          <li
                            key={m.id}
                            className={cx(
                              'flex gap-3 items-start p-3 rounded-lg border transition-colors',
                              on && 'bg-violet-500/15 border-violet-500/40',
                              !on && 'border-white/10 bg-[#1c1b1a]'
                            )}
                          >
                            <input
                              type="checkbox"
                              id={`mod-${m.id}`}
                              checked={on}
                              onChange={(e) =>
                                setModulosDraft((d) => ({ ...d, [m.id]: e.target.checked }))
                              }
                              className="mt-1 w-4 h-4 rounded border-gray-500 accent-violet-500 text-violet-600 focus:ring-violet-500"
                            />
                            <label htmlFor={`mod-${m.id}`} className="flex-1 cursor-pointer">
                              <span
                                className={cx(
                                  'font-medium block',
                                  on ? 'text-violet-100' : 'text-gray-200'
                                )}
                              >
                                {m.etiqueta}
                              </span>
                              <span className="text-xs text-gray-400 block mt-0.5">
                                {m.descripcion}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={guardarModulos}
                    disabled={guardandoModulos}
                    className="mt-6 w-full py-2.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {guardandoModulos ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <p className="text-xs text-gray-500">
                    Períodos y totales según los registros de vacaciones del sistema (vista administración).
                  </p>
                  {vacError ? <p className="text-sm text-red-400">{vacError}</p> : null}
                  {vacCargando ? (
                    <div className="flex justify-center py-16">
                      <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      {vacResumen ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg border border-white/10 bg-[#1c1b1a] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Ganados
                            </p>
                            <p className="mt-1 text-xl font-bold text-sky-300">{vacResumen.total_ganados ?? 0}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-[#1c1b1a] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Gozados
                            </p>
                            <p className="mt-1 text-xl font-bold text-emerald-300">{vacResumen.total_gozados ?? 0}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-[#1c1b1a] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Pendientes
                            </p>
                            <p className="mt-1 text-xl font-bold text-violet-300">{vacResumen.total_pendientes ?? 0}</p>
                          </div>
                        </div>
                      ) : null}

                      {!vacPeriodos.length && !vacError ? (
                        <div className="flex flex-col items-center py-10 text-gray-500">
                          <CalendarDaysIcon className="mb-2 h-10 w-10 text-gray-600" />
                          <p>No hay períodos registrados para este usuario.</p>
                        </div>
                      ) : vacPeriodos.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1c1b1a]">
                          <div className="max-h-[min(52vh,520px)] overflow-x-auto overflow-y-auto">
                            <table className="w-full min-w-[640px] text-left text-xs text-gray-300">
                              <thead className="sticky top-0 z-[1] border-b border-white/10 bg-[#252423]">
                                <tr className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                  <th className="px-2 py-2">Estado</th>
                                  <th className="px-2 py-2 text-center">Inicio</th>
                                  <th className="px-2 py-2 text-center">Fin</th>
                                  <th className="px-2 py-2 text-center">Días período</th>
                                  <th className="px-2 py-2 text-center">Vacaciones</th>
                                  <th className="px-2 py-2 text-center">Gozados</th>
                                  <th className="px-2 py-2 text-center">Salidas</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.06]">
                                {vacPeriodos.map((periodo) => {
                                  let diasCal = '—';
                                  if (periodo.fecha_inicio_periodo && periodo.fecha_fin_periodo) {
                                    try {
                                      diasCal =
                                        differenceInDays(
                                          parseFechaSegura(periodo.fecha_fin_periodo),
                                          parseFechaSegura(periodo.fecha_inicio_periodo)
                                        );
                                    } catch {
                                      diasCal = '—';
                                    }
                                  }
                                  return (
                                    <tr key={periodo.id} className="hover:bg-white/[0.03]">
                                      <td className="px-2 py-2">
                                        <span
                                          className={cx(
                                            'inline-block rounded-md border px-2 py-0.5 font-medium',
                                            badgeClaseVacacion(periodo.estado)
                                          )}
                                        >
                                          {etiquetaVacacionEstado(periodo.estado)}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-center text-gray-200">
                                        {periodo.fecha_inicio_periodo
                                          ? formatoFechaDMY(periodo.fecha_inicio_periodo)
                                          : '—'}
                                      </td>
                                      <td className="px-2 py-2 text-center text-gray-200">
                                        {periodo.fecha_fin_periodo ? formatoFechaDMY(periodo.fecha_fin_periodo) : '—'}
                                      </td>
                                      <td className="px-2 py-2 text-center">{diasCal}</td>
                                      <td className="px-2 py-2 text-center font-semibold text-teal-300">
                                        {periodo.dias_correspondientes ?? '—'}
                                      </td>
                                      <td className="px-2 py-2 text-center">{periodo.dias_gozados ?? '—'}</td>
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => abrirSalidasVacacion(periodo)}
                                          title="Ver salidas aprobadas"
                                          className="inline-flex rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-teal-300"
                                        >
                                          <EyeIcon className="h-5 w-5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {modalSalidas && periodoSalidas && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar"
            onClick={cerrarSalidasVacacion}
          />
          <div className="relative z-[71] flex max-h-[min(560px,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/15 bg-[#252423] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Salidas del período</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {periodoSalidas.fecha_inicio_periodo ? formatoFechaDMY(periodoSalidas.fecha_inicio_periodo) : '—'}{' '}
                  –{' '}
                  {periodoSalidas.fecha_fin_periodo ? formatoFechaDMY(periodoSalidas.fecha_fin_periodo) : '—'}
                  {' · '}
                  {periodoSalidas.dias_correspondientes ?? '—'} días asignados
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarSalidasVacacion}
                className="rounded p-1 text-gray-400 hover:bg-white/10"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {salidasCargando ? (
                <div className="flex justify-center py-14">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                </div>
              ) : listaSalidas.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <DocumentTextIcon className="mx-auto mb-2 h-10 w-10 text-gray-600" />
                  <p>No hay salidas registradas para este período.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-2">Salida</th>
                      <th className="py-2 pr-2">Retorno</th>
                      <th className="py-2 text-center">Días</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {listaSalidas.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 pr-2">
                          {s.fecha_inicio_vacaciones ? formatoFechaDMY(s.fecha_inicio_vacaciones) : '—'}
                        </td>
                        <td className="py-2 pr-2">
                          {s.fecha_fin_vacaciones ? formatoFechaDMY(s.fecha_fin_vacaciones) : '—'}
                        </td>
                        <td className="py-2 text-center font-semibold text-teal-300">
                          {s.dias_solicitados ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-semibold text-white">
                      <td colSpan={2} className="py-2 text-right text-xs">
                        Total días gozados
                      </td>
                      <td className="py-2 text-center text-teal-300">
                        {listaSalidas.reduce((acc, s) => acc + (Number(s.dias_solicitados) || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAlta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#252423] border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Agregar usuario</h3>
            <form onSubmit={crearUsuario} className="space-y-3 text-sm">
              <div>
                <input
                  required
                  placeholder="Código empleado"
                  className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                  value={formAlta.codigo_empleado}
                  onChange={(e) => setFormAlta((f) => ({ ...f, codigo_empleado: e.target.value }))}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Al elegir el rol se propone un código con prefijo según el rol y el siguiente número libre
                  (p. ej. EMP001, CON004). Puedes cambiarlo.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {formAlta.rol_id ? (
                    <span className="text-[11px] text-gray-400">
                      Sugerido ahora:{' '}
                      <span className="text-violet-300 font-mono">{codigoSugeridoAltaVista}</span>
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={aplicarSugerenciaCodigoAlta}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Aplicar sugerencia
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Nombres"
                  className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                  value={formAlta.nombres}
                  onChange={(e) => setFormAlta((f) => ({ ...f, nombres: e.target.value }))}
                />
                <input
                  required
                  placeholder="Apellidos"
                  className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                  value={formAlta.apellidos}
                  onChange={(e) => setFormAlta((f) => ({ ...f, apellidos: e.target.value }))}
                />
              </div>
              <input
                required
                placeholder="DNI"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.dni}
                onChange={(e) => setFormAlta((f) => ({ ...f, dni: e.target.value }))}
              />
              <input
                required
                type="email"
                placeholder="Correo"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.email}
                onChange={(e) => setFormAlta((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                required
                type="password"
                placeholder="Contraseña inicial"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.password}
                onChange={(e) => setFormAlta((f) => ({ ...f, password: e.target.value }))}
              />
              <input
                placeholder="Cargo (opcional)"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.cargo}
                onChange={(e) => setFormAlta((f) => ({ ...f, cargo: e.target.value }))}
              />
              <input
                required
                type="date"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.fecha_ingreso}
                onChange={(e) => setFormAlta((f) => ({ ...f, fecha_ingreso: e.target.value }))}
              />
              <select
                required
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.rol_id}
                onChange={(e) => setFormAlta((f) => ({ ...f, rol_id: e.target.value }))}
                title="Al cambiar el rol se actualiza el código propuesto"
              >
                <option value="">Rol…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalAlta(false);
                    prevRolAltaRef.current = '';
                    ultimoCodigoSugeridoAltaRef.current = '';
                  }}
                  className="px-4 py-2 rounded border border-white/20 text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white font-medium"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
