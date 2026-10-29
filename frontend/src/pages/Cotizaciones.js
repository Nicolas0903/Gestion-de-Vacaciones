import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { cotizacionSolicitudesService, cotizacionesService } from '../services/api';
import { formatoMontoRendicion, normalizarMonedaRendicion } from '../utils/monedaRendicion';
import ModalPortal from '../components/ModalPortal';
import NuevaCotizacionModal from '../components/cotizaciones/NuevaCotizacionModal';
import CotizacionGeneralForm from '../components/cotizaciones/CotizacionGeneralForm';
import CotizacionesActividades from '../components/cotizaciones/CotizacionesActividades';
import CotizacionesCostos from '../components/cotizaciones/CotizacionesCostos';
import CotizacionesPropuesta from '../components/cotizaciones/CotizacionesPropuesta';
import CotizacionesAdjuntos from '../components/cotizaciones/CotizacionesAdjuntos';
import { ESTADOS_COTIZACION } from '../components/cotizaciones/CotizacionGeneralForm';
import {
  actividadesConTipoProyecto,
  borradorConSyncPerfilesCostos,
  nombreVisibleTipoProyecto,
  tiposProyectoOpciones
} from '../utils/cotizacionTiposProyecto';
import {
  mensajeValidacionActividades,
  validarActividadesDimensionamiento
} from '../utils/cotizacionActividadesValidacion';

function cambiosDeVersion(v) {
  const raw = v?.cambios_json;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

const TABS = [
  { id: 'general', label: 'Información general' },
  { id: 'actividades', label: 'Actividades' },
  { id: 'costos', label: 'Costos' },
  { id: 'propuesta', label: 'Propuesta' },
  { id: 'adjuntos', label: 'Adjuntos' },
  { id: 'versiones', label: 'Versiones' }
];

const Cotizaciones = () => {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [borrador, setBorrador] = useState(null);
  const [tab, setTab] = useState('general');
  const [guardando, setGuardando] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [comentarioVersion, setComentarioVersion] = useState('');
  const [versionDetalleId, setVersionDetalleId] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [busqueda, setBusqueda] = useState({ q: '', ruc: '', estado: '', desde: '', hasta: '' });
  const [filtrosApi, setFiltrosApi] = useState({});
  const tiposProyectoUi = React.useMemo(() => tiposProyectoOpciones(), []);

  const aplicarBusqueda = () => {
    const params = {};
    if (busqueda.q.trim()) params.q = busqueda.q.trim();
    if (busqueda.ruc.trim()) params.ruc = busqueda.ruc.trim();
    if (busqueda.estado) params.estado = busqueda.estado;
    if (busqueda.desde) params.desde = busqueda.desde;
    if (busqueda.hasta) params.hasta = busqueda.hasta;
    setFiltrosApi(params);
  };

  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cotizacionesService.listar(filtrosApi);
      setLista(data.data || []);
    } catch {
      toast.error('No se pudo cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  }, [filtrosApi]);

  const cargarDetalle = useCallback(async (id) => {
    if (!id) {
      setDetalle(null);
      setBorrador(null);
      return;
    }
    try {
      const { data } = await cotizacionesService.obtener(id);
      setDetalle(data.data);
      setBorrador(data.data.borrador);
    } catch {
      toast.error('No se pudo cargar la cotización');
      setSelId(null);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    cargarDetalle(selId);
    if (selId) setTab('general');
  }, [selId, cargarDetalle]);

  useEffect(() => {
    setTipos(tiposProyectoOpciones());
    cotizacionesService.responsables().then(({ data }) => setResponsables(data.data || [])).catch(() => {});
    cotizacionSolicitudesService
      .listar({ equipo: 1 })
      .then(({ data }) => setSolicitudesPendientes(data.data || []))
      .catch(() => {});
  }, []);

  const cot = detalle?.cotizacion;
  const versiones = detalle?.versiones || [];
  const moneda = normalizarMonedaRendicion(borrador?.costos?.parametros?.moneda);
  const fmt = (n) => formatoMontoRendicion(n, moneda);

  const validacionActividades = React.useMemo(
    () => validarActividadesDimensionamiento(borrador?.actividades),
    [borrador?.actividades]
  );
  const advertenciaActividades =
    validacionActividades.iniciado && !validacionActividades.ok;

  const guardar = async () => {
    if (!selId || !borrador) return;
    setGuardando(true);
    try {
      const versionAntes = cot?.version_actual;
      const payload = borradorConSyncPerfilesCostos(borrador);
      const { data } = await cotizacionesService.guardarBorrador(selId, payload);
      setDetalle(data.data);
      setBorrador(data.data.borrador);
      const versionDespues = data.data.cotizacion?.version_actual;
      if (versionDespues != null && versionDespues !== versionAntes) {
        toast.success(`Guardado. Versión ${versionDespues} registrada (editado por ti).`);
      } else {
        toast.success('Cambios guardados (sin cambios respecto a la versión actual).');
      }
      if (advertenciaActividades) {
        toast('Borrador guardado. Aún falta cuadrar actividades (ver aviso en la pestaña).', {
          icon: '⚠️'
        });
      }
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const publicarVersion = async () => {
    if (!selId) return;
    setGuardando(true);
    try {
      const versionAntes = cot?.version_actual;
      const payload = {
        ...borradorConSyncPerfilesCostos(borrador),
        comentario_version: comentarioVersion.trim() || undefined
      };
      const { data } = await cotizacionesService.guardarBorrador(selId, payload);
      setDetalle(data.data);
      setBorrador(data.data.borrador);
      setModalPublicar(false);
      setComentarioVersion('');
      const v = data.data.cotizacion?.version_actual;
      if (v != null && v !== versionAntes) {
        toast.success(`Versión ${v} registrada`);
      } else {
        toast.success('Sin cambios respecto a la versión actual');
      }
      if (advertenciaActividades) {
        toast('Versión guardada; el dimensionamiento aún está incompleto.', { icon: '⚠️' });
      }
      cargarLista();
      setTab('versiones');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al publicar');
    } finally {
      setGuardando(false);
    }
  };

  const rechazarSolicitud = async (solId) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') ?? '';
    if (motivo === null) return;
    setGuardando(true);
    try {
      await cotizacionSolicitudesService.cancelar(solId, { motivo });
      toast.success('Solicitud rechazada');
      setSolicitudesPendientes((p) => p.filter((s) => s.id !== solId));
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo rechazar');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarDesdeSolicitud = async (solId) => {
    setGuardando(true);
    try {
      const { data } = await cotizacionSolicitudesService.crearCotizacion(solId);
      const cotRow = data.data.cotizacion?.cotizacion;
      toast.success(`Cotización ${cotRow?.codigo || ''} creada`);
      setSolicitudesPendientes((p) => p.filter((s) => s.id !== solId));
      await cargarLista();
      if (cotRow?.id) setSelId(cotRow.id);
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo crear la cotización');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCotizacion = async () => {
    if (!selId || !cot) return;
    const msg = `¿Eliminar la cotización ${cot.codigo}?\n\nEsta acción no se puede deshacer. El correlativo quedará disponible para una nueva cotización.`;
    if (!window.confirm(msg)) return;
    setGuardando(true);
    try {
      await cotizacionesService.eliminar(selId);
      toast.success(`Cotización ${cot.codigo} eliminada`);
      setSelId(null);
      setDetalle(null);
      setBorrador(null);
      await cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

  const restaurarVersion = async (versionNum) => {
    if (!selId || !window.confirm(`¿Restaurar versión ${versionNum}?`)) return;
    try {
      const { data } = await cotizacionesService.restaurarVersion(selId, versionNum, {
        comentario: `Restaurada desde v${versionNum}`
      });
      setDetalle(data.data);
      setBorrador(data.data.borrador);
      toast.success('Versión restaurada');
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error');
    }
  };

  if (loading && !lista.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20">
      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> Portal
        </Link>

        {solicitudesPendientes.length > 0 && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
            <h2 className="font-semibold text-indigo-900 text-sm">
              Solicitudes para elaborar (comercial → responsable)
            </h2>
            <p className="text-xs text-indigo-800/80 mt-1 mb-2">
              Revisa la info y pulsa <strong>Crear cotización</strong> para tomar la solicitud. Admin ve todas;
              el responsable asignado solo ve las suyas.
            </p>
            <ul className="mt-2 space-y-2">
              {solicitudesPendientes.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{s.codigo}</strong> · {s.cliente} · {s.nombre_proyecto}
                    <span className="text-slate-500 ml-2">
                      ({s.solicitante_nombre}
                      {s.responsable_nombre ? ` → ${s.responsable_nombre}` : ''})
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => iniciarDesdeSolicitud(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs"
                    >
                      Crear cotización
                    </button>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => rechazarSolicitud(s.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-white text-xs"
                    >
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cotizaciones</h1>
            <p className="text-sm text-slate-500">
              Información general · Actividades · Costos · Propuesta · Adjuntos · Versiones
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalNueva(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium"
          >
            <PlusIcon className="w-5 h-5" /> Nueva cotización
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b font-medium text-slate-700">Listado</div>
              <div className="px-3 py-3 border-b space-y-2 bg-slate-50/80">
                <input
                  type="search"
                  placeholder="Buscar código, proyecto, cliente…"
                  value={busqueda.q}
                  onChange={(e) => setBusqueda((b) => ({ ...b, q: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="RUC"
                  value={busqueda.ruc}
                  onChange={(e) => setBusqueda((b) => ({ ...b, ruc: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                />
                <select
                  value={busqueda.estado}
                  onChange={(e) => setBusqueda((b) => ({ ...b, estado: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_COTIZACION.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    title="Actualizado desde"
                    value={busqueda.desde}
                    onChange={(e) => setBusqueda((b) => ({ ...b, desde: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="date"
                    title="Actualizado hasta"
                    value={busqueda.hasta}
                    onChange={(e) => setBusqueda((b) => ({ ...b, hasta: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={aplicarBusqueda}
                  className="w-full py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium"
                >
                  Buscar
                </button>
              </div>
              <div className="max-h-[55vh] overflow-y-auto divide-y">
                {!loading && lista.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">Sin resultados</p>
                )}
                {lista.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelId(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                      selId === c.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{c.codigo}</div>
                    <div className="text-xs text-slate-500 truncate">{c.proyecto}</div>
                    <div className="text-xs text-slate-400">{c.cliente}</div>
                    {c.ruc_cliente && (
                      <div className="text-xs text-slate-400">RUC {c.ruc_cliente}</div>
                    )}
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="bg-slate-100 px-2 rounded">v{c.version_actual || 0}</span>
                      <span className="text-teal-700">{c.version_monto != null ? fmt(c.version_monto) : '—'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-9">
            {!selId ? (
              <div className="bg-white rounded-2xl border p-16 text-center text-slate-500">
                Selecciona o crea una cotización
              </div>
            ) : (
              <div className="bg-white rounded-2xl border shadow-sm">
                <div className="px-4 py-3 border-b flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-lg">{cot?.codigo}</h2>
                    <p className="text-sm text-slate-500">
                      {cot?.proyecto} · {cot?.cliente} ·{' '}
                      {nombreVisibleTipoProyecto(cot?.tipo_proyecto_codigo, cot?.tipo_proyecto)} ·{' '}
                      {cot?.responsable_nombre}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={guardar}
                      disabled={guardando}
                      title={
                        advertenciaActividades
                          ? mensajeValidacionActividades(validacionActividades)
                          : 'Guarda borrador y versiona si hay cambios'
                      }
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalPublicar(true)}
                      disabled={guardando}
                      title={
                        advertenciaActividades
                          ? `Pendiente: ${mensajeValidacionActividades(validacionActividades)}`
                          : undefined
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Nueva versión
                    </button>
                    <button
                      type="button"
                      onClick={eliminarCotizacion}
                      disabled={guardando}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="flex border-b px-2 pt-2 gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2 text-sm rounded-t-lg ${
                        tab === t.id ? 'bg-teal-50 text-teal-800 font-medium border border-b-0 border-teal-200' : 'text-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 md:p-6">
                  {tab === 'general' && borrador && (
                    <CotizacionGeneralForm
                      form={{
                        codigo: cot?.codigo || borrador.general?.codigo,
                        estado: borrador.general?.estado || cot?.estado,
                        nombre_proyecto: borrador.general?.nombre_proyecto || cot?.proyecto,
                        cliente: borrador.general?.cliente || cot?.cliente,
                        tipo_proyecto: borrador.general?.tipo_proyecto || cot?.tipo_proyecto,
                        tipo_proyecto_codigo:
                          borrador.general?.tipo_proyecto_codigo || cot?.tipo_proyecto_codigo,
                        responsable_ids:
                          borrador.general?.responsable_ids ||
                          (borrador.general?.responsable_id || cot?.responsable_id
                            ? [borrador.general?.responsable_id || cot?.responsable_id]
                            : []),
                        responsable_id: borrador.general?.responsable_id || cot?.responsable_id,
                        notas_internas: borrador.general?.notas_internas || cot?.notas_internas
                      }}
                      tipos={tiposProyectoUi}
                      responsables={responsables}
                      codigoReadOnly
                      onChange={(patch) =>
                        setBorrador((p) => {
                          const general = { ...p.general, ...patch };
                          const actividades =
                            patch.tipo_proyecto != null || patch.tipo_proyecto_codigo != null
                              ? actividadesConTipoProyecto(
                                  p.actividades,
                                  patch.tipo_proyecto_codigo ||
                                    patch.tipo_proyecto ||
                                    general.tipo_proyecto_codigo ||
                                    general.tipo_proyecto
                                )
                              : p.actividades;
                          return { ...p, general, actividades };
                        })
                      }
                    />
                  )}

                  {tab === 'actividades' && borrador && (
                    <CotizacionesActividades
                      actividades={borrador.actividades}
                      tipoProyecto={borrador.general?.tipo_proyecto || cot?.tipo_proyecto}
                      tipoProyectoCodigo={
                        borrador.general?.tipo_proyecto_codigo || cot?.tipo_proyecto_codigo
                      }
                      onChange={(actividades) =>
                        setBorrador((p) => borradorConSyncPerfilesCostos({ ...p, actividades }))
                      }
                    />
                  )}

                  {tab === 'costos' && borrador && (
                    <CotizacionesCostos
                      costos={borrador.costos}
                      codigo={cot?.codigo}
                      versionActual={cot?.version_actual}
                      onChange={(costos) =>
                        setBorrador((p) => borradorConSyncPerfilesCostos({ ...p, costos }))
                      }
                    />
                  )}

                  {tab === 'adjuntos' && selId && (
                    <CotizacionesAdjuntos
                      cotizacionId={selId}
                      codigo={cot?.codigo}
                      onSolicitudEnviada={(data) => {
                        if (data) {
                          setDetalle(data);
                          setBorrador(data.borrador);
                        }
                        cargarLista();
                      }}
                    />
                  )}

                  {tab === 'propuesta' && borrador && (
                    <CotizacionesPropuesta
                      propuesta={borrador.propuesta}
                      costos={borrador.costos}
                      actividades={borrador.actividades}
                      onChange={(propuesta) => setBorrador((p) => ({ ...p, propuesta }))}
                    />
                  )}

                  {tab === 'versiones' && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-800 mb-1">Historial por usuario</p>
                        <p className="text-slate-600">
                          Cada <strong>Guardar</strong> con cambios registra una versión con <strong>editado por</strong>.
                          Haz clic en una fila para ver qué cambió respecto a la versión anterior.
                        </p>
                      </div>
                      {versiones.length === 0 && (
                        <p className="text-slate-500 flex items-center gap-2">
                          <ClockIcon className="w-5 h-5" /> Sin versiones
                        </p>
                      )}
                      {versiones.map((v) => {
                        const expandida = versionDetalleId === v.id;
                        const cambios = cambiosDeVersion(v);
                        return (
                          <div
                            key={v.id}
                            className="rounded-xl border bg-slate-50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setVersionDetalleId(expandida ? null : v.id)}
                              className="w-full flex flex-wrap justify-between gap-2 p-4 text-left hover:bg-slate-100/80 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium flex items-center gap-2">
                                  Versión {v.version_num}
                                  {v.es_actual && (
                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                                      Actual
                                    </span>
                                  )}
                                  {expandida ? (
                                    <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Editado por:{' '}
                                  <span className="text-slate-700">{v.creado_por_nombre || '—'}</span>
                                  {' · '}
                                  {new Date(v.created_at).toLocaleString('es-PE')}
                                </div>
                                {v.comentario_cambio && (
                                  <p className="text-sm mt-1 text-slate-600">{v.comentario_cambio}</p>
                                )}
                                <p className="text-sm mt-1">
                                  Propuesta: {fmt(v.monto_propuesta)} · Costo: {fmt(v.costo_total)}
                                </p>
                              </div>
                              {!v.es_actual && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restaurarVersion(v.version_num);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      restaurarVersion(v.version_num);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-lg bg-white shrink-0"
                                >
                                  <DocumentDuplicateIcon className="w-4 h-4" /> Restaurar
                                </span>
                              )}
                            </button>
                            {expandida && (
                              <div className="border-t border-slate-200 bg-white px-4 py-3">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                  Cambios en esta versión
                                </p>
                                {cambios.length === 0 ? (
                                  <p className="text-sm text-slate-500">Sin detalle de cambios (versión anterior a este registro).</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-left text-slate-500 border-b">
                                          <th className="py-1.5 pr-3 font-medium">Campo</th>
                                          <th className="py-1.5 pr-3 font-medium">Antes</th>
                                          <th className="py-1.5 font-medium">Después</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cambios.map((c, i) => (
                                          <tr key={`${c.campo}-${i}`} className="border-b border-slate-100 last:border-0">
                                            <td className="py-1.5 pr-3 text-slate-800">{c.campo}</td>
                                            <td className="py-1.5 pr-3 text-slate-500">{c.antes}</td>
                                            <td className="py-1.5 text-slate-800">{c.despues}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <NuevaCotizacionModal
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        onCreada={(d) => {
          cargarLista();
          setSelId(d.cotizacion.id);
        }}
      />

      <ModalPortal
        open={modalPublicar}
        onClose={() => setModalPublicar(false)}
        title="Guardar con comentario"
        subtitle="Opcional: añade un comentario a la versión que se registrará al guardar (si hay cambios)."
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button type="button" onClick={() => setModalPublicar(false)} className="px-4 py-2 text-sm border rounded-lg">
              Cancelar
            </button>
            <button
              type="button"
              onClick={publicarVersion}
              disabled={guardando}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg disabled:opacity-50"
            >
              Guardar versión
            </button>
          </div>
        }
      >
        <textarea
          value={comentarioVersion}
          onChange={(e) => setComentarioVersion(e.target.value)}
          placeholder="Motivo del cambio (opcional)"
          rows={3}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </ModalPortal>
    </div>
  );
};

export default Cotizaciones;
