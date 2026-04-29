import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  TrashIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  NoSymbolIcon,
  ArrowLeftIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { adminPortalUsuariosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const cx = (...parts) => parts.filter(Boolean).join(' ');

function iniciales(nombres, apellidos) {
  const a = (nombres || '').trim().charAt(0) || '';
  const b = (apellidos || '').trim().charAt(0) || '';
  return (a + b).toUpperCase() || '?';
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

  const [modalAlta, setModalAlta] = useState(false);
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

  const abrirDetalle = async (id) => {
    setDrawerId(id);
    setTabDetalle('cuenta');
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      const res = await adminPortalUsuariosService.obtener(id);
      const { empleado, modulos_editor } = res.data.data;
      setDetalle({ empleado, modulos_editor });
      const draft = {};
      (modulos_editor || []).forEach((m) => {
        draft[m.id] = !!m.asignado;
      });
      setModulosDraft(draft);
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo cargar el usuario');
      setDrawerId(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDrawer = () => {
    setDrawerId(null);
    setDetalle(null);
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
    if (
      !window.confirm(
        `¿Desactivar ${idsSeleccionados.length} usuario(s)? No podrán iniciar sesión.`
      )
    ) {
      return;
    }
    try {
      for (const id of idsSeleccionados) {
        if (id === usuario?.id) continue;
        await adminPortalUsuariosService.bloquear(id);
      }
      toast.success('Usuario(s) desactivado(s)');
      setSeleccion(new Set());
      cerrarDrawer();
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al desactivar');
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

  const guardarModulos = async () => {
    if (!detalle?.empleado) return;
    setGuardandoModulos(true);
    try {
      await adminPortalUsuariosService.actualizarModulos(detalle.empleado.id, modulosDraft);
      toast.success('Acceso guardado');
      const res = await adminPortalUsuariosService.obtener(detalle.empleado.id);
      setDetalle(res.data.data);
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo guardar');
    } finally {
      setGuardandoModulos(false);
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

  const cuentaActivos = detalle?.modulos_editor
    ? Object.values(modulosDraft).filter(Boolean).length
    : 0;

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
            onClick={() => setModalAlta(true)}
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
                      <td className="px-3 py-3 text-gray-300 max-w-md">
                        {(row.acceso_portal || []).length ? (
                          <span className="line-clamp-2">
                            {(row.acceso_portal || []).join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-500">Sin accesos según rol</span>
                        )}
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
          <aside className="relative z-50 w-full max-w-lg h-full bg-[#252423] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden">
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

            <div className="flex border-b border-white/10 px-5 gap-6 text-sm">
              {['cuenta', 'acceso'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTabDetalle(t)}
                  className={cx(
                    'py-3 border-b-2 -mb-px capitalize',
                    tabDetalle === t
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  )}
                >
                  {t === 'cuenta' ? 'Cuenta' : 'Acceso a la plataforma'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!detalle?.empleado ? null : tabDetalle === 'cuenta' ? (
                <div className="grid grid-cols-1 gap-5 text-sm">
                  <Campo label="Correo" valor={detalle.empleado.email} />
                  <Campo label="Rol" valor={detalle.empleado.rol_nombre} />
                  <Campo label="Código empleado" valor={detalle.empleado.codigo_empleado} />
                  <Campo label="DNI" valor={detalle.empleado.dni} />
                  <Campo label="Cargo" valor={detalle.empleado.cargo || '—'} />
                  <Campo
                    label="Fecha de ingreso"
                    valor={detalle.empleado.fecha_ingreso?.slice(0, 10) || '—'}
                  />
                  <Campo
                    label="Estado"
                    valor={detalle.empleado.activo ? 'Activo' : 'Bloqueado'}
                  />
                </div>
              ) : (
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
                      {(detalle.modulos_editor || []).map((m) => (
                        <li
                          key={m.id}
                          className="flex gap-3 items-start p-3 rounded-lg bg-[#1c1b1a] border border-white/10"
                        >
                          <input
                            type="checkbox"
                            id={`mod-${m.id}`}
                            checked={!!modulosDraft[m.id]}
                            onChange={(e) =>
                              setModulosDraft((d) => ({ ...d, [m.id]: e.target.checked }))
                            }
                            className="mt-1 w-4 h-4 rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`mod-${m.id}`} className="cursor-pointer flex-1">
                            <span className="font-medium text-white block">{m.etiqueta}</span>
                            <span className="text-xs text-gray-400 block mt-0.5">
                              {m.descripcion}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={guardarModulos}
                    disabled={guardandoModulos}
                    className="mt-6 w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {guardandoModulos ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {modalAlta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#252423] border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Agregar usuario</h3>
            <form onSubmit={crearUsuario} className="space-y-3 text-sm">
              <input
                required
                placeholder="Código empleado"
                className="w-full px-3 py-2 rounded bg-[#1c1b1a] border border-white/15 text-white"
                value={formAlta.codigo_empleado}
                onChange={(e) => setFormAlta((f) => ({ ...f, codigo_empleado: e.target.value }))}
              />
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
                  onClick={() => setModalAlta(false)}
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

function Campo({ label, valor }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="text-white mt-1">{valor}</div>
    </div>
  );
}
