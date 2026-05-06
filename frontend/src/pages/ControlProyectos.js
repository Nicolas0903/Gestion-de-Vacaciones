import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, FolderIcon, ClockIcon } from '@heroicons/react/24/outline';
import { controlProyectosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatoFechaDMY, formatoFechaHoraDMY } from '../utils/dateUtils';

const REQUERIDO_POR_OPTS = [
  { value: 'ricardo_martinez', label: 'Ricardo Martínez' },
  { value: 'rodrigo_loayza', label: 'Rodrigo Loayza' },
  { value: 'juan_pena', label: 'Juan Peña' },
  { value: 'magali_sevillano', label: 'Magali Sevillano' },
  { value: 'enrique_agapito', label: 'Enrique Agapito' }
];

const EST_PROY = [
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'perdido', label: 'Perdido' }
];

const PRIOR = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Medio' },
  { value: 'alta', label: 'Alta' }
];

const EST_ACT = [
  { value: 'no_iniciado', label: 'No iniciado' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'cerrado', label: 'Cerrado' }
];

const SIT_PAGO = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' }
];

function sqlADatetimeLocal(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (s.includes('T')) return s.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.replace(' ', 'T').slice(0, 16);
  return '';
}

function previewHorasIniFin(iniLocal, finLocal) {
  if (!iniLocal || !finLocal || iniLocal.length < 16 || finLocal.length < 16) return null;
  const a = new Date(iniLocal);
  const b = new Date(finLocal);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return null;
  return Math.round((((b - a) / 3600000) * 100)) / 100;
}

/** IDs numéricos únicos para multiselect de consultores */
function normalizaIdsConsultores(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
}

const proyectoVacio = () => ({
  empresa: '',
  proyecto: '',
  fecha_inicio: '',
  fecha_fin: '',
  consultores_empleado_ids: [],
  horas_asignadas: '',
  estado: 'pendiente',
  detalles: ''
});

const actividadVacia = () => ({
  proyecto_id: '',
  requerido_por: 'ricardo_martinez',
  descripcion_actividad: '',
  prioridad: 'media',
  fecha_hora_inicio: '',
  fecha_hora_fin: '',
  estado: 'no_iniciado',
  comentarios: '',
  situacion_pago: 'pendiente'
});

const ControlProyectos = () => {
  const { usuario, puedeGestionarProyectosCp, esAdmin } = useAuth();
  const puedeProy = puedeGestionarProyectosCp();
  const [tab, setTab] = useState('proyectos');
  const [cargando, setCargando] = useState(true);
  const [proyectos, setProyectos] = useState([]);
  const [misProyectos, setMisProyectos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [proyectoEditId, setProyectoEditId] = useState(null);
  const [actividadEditId, setActividadEditId] = useState(null);
  const [proyForm, setProyForm] = useState(proyectoVacio);
  const [actForm, setActForm] = useState(actividadVacia);
  const [filtroProyectoAct, setFiltroProyectoAct] = useState('');
  const nombreUsuario = `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim();

  const cargarMisProyectos = useCallback(async () => {
    const { data } = await controlProyectosService.misProyectos();
    setMisProyectos(data.data || []);
  }, []);

  const cargarProyectosTodos = useCallback(async () => {
    if (!puedeProy) return;
    const { data } = await controlProyectosService.listarProyectos();
    setProyectos(data.data || []);
  }, [puedeProy]);

  const cargarConsultores = useCallback(async () => {
    if (!puedeProy) return;
    const { data } = await controlProyectosService.consultoresSelect();
    setConsultores(data.data || []);
  }, [puedeProy]);

  const cargarActividades = useCallback(async () => {
    const params = {};
    if (filtroProyectoAct) params.proyecto_id = filtroProyectoAct;
    const { data } = await controlProyectosService.listarActividades(params);
    setActividades(data.data || []);
  }, [filtroProyectoAct]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      try {
        await cargarMisProyectos();
        if (puedeProy) await Promise.all([cargarProyectosTodos(), cargarConsultores()]);
      } catch {
        if (!cancel) toast.error('Error al cargar control de proyectos. ¿Ejecutaste la migración SQL?');
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [puedeProy, cargarMisProyectos, cargarProyectosTodos, cargarConsultores]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await cargarActividades();
      } catch {
        if (!cancel) toast.error('Error al cargar actividades.');
      }
    })();
    return () => {
      cancel = true;
    };
  }, [cargarActividades]);

  const horasPreviewAct = useMemo(
    () => previewHorasIniFin(actForm.fecha_hora_inicio, actForm.fecha_hora_fin),
    [actForm.fecha_hora_inicio, actForm.fecha_hora_fin]
  );

  const resetProyForm = () => {
    setProyForm(proyectoVacio());
    setProyectoEditId(null);
  };

  const submitProyecto = async (e) => {
    e.preventDefault();
    try {
      const body = {
        empresa: proyForm.empresa,
        proyecto: proyForm.proyecto,
        fecha_inicio: proyForm.fecha_inicio,
        fecha_fin: proyForm.fecha_fin,
        horas_asignadas: parseFloat(String(proyForm.horas_asignadas).replace(',', '.')) || 0,
        estado: proyForm.estado,
        detalles: proyForm.detalles,
        consultores_empleado_ids: Array.isArray(proyForm.consultores_empleado_ids)
          ? normalizaIdsConsultores(proyForm.consultores_empleado_ids)
          : []
      };
      if (!body.empresa.trim() || !body.proyecto.trim() || !body.fecha_inicio || !body.fecha_fin) {
        toast.error('Complete los campos obligatorios del proyecto.');
        return;
      }
      if (!body.consultores_empleado_ids.length) {
        toast.error('Seleccione al menos un consultor del portal.');
        return;
      }
      if (proyectoEditId) {
        await controlProyectosService.actualizarProyecto(proyectoEditId, body);
        toast.success('Proyecto actualizado.');
      } else {
        await controlProyectosService.crearProyecto(body);
        toast.success('Proyecto creado.');
      }
      resetProyForm();
      await cargarProyectosTodos();
      await cargarMisProyectos();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar proyecto');
    }
  };

  const submitActividad = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...actForm,
        proyecto_id: parseInt(actForm.proyecto_id, 10),
        horas_trabajadas: horasPreviewAct != null ? horasPreviewAct : undefined
      };
      if (!body.proyecto_id) {
        toast.error('Seleccione un proyecto.');
        return;
      }
      if (!body.descripcion_actividad.trim()) {
        toast.error('Indique la descripción de la actividad.');
        return;
      }
      if (!body.fecha_hora_inicio || !body.fecha_hora_fin) {
        toast.error('Indique inicio y fin.');
        return;
      }
      if (horasPreviewAct == null) {
        toast.error('La fecha y hora de fin debe ser posterior a la de inicio para calcular las horas.');
        return;
      }
      if (actividadEditId) {
        await controlProyectosService.actualizarActividad(actividadEditId, body);
        toast.success('Actividad actualizada.');
      } else {
        await controlProyectosService.crearActividad(body);
        toast.success('Actividad registrada.');
      }
      setActForm(actividadVacia());
      setActividadEditId(null);
      await cargarActividades();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar actividad');
    }
  };

  const abrirEditProyecto = (p) => {
    setProyectoEditId(p.id);
    setProyForm({
      empresa: p.empresa || '',
      proyecto: p.proyecto || '',
      fecha_inicio: p.fecha_inicio ? String(p.fecha_inicio).slice(0, 10) : '',
      fecha_fin: p.fecha_fin ? String(p.fecha_fin).slice(0, 10) : '',
        consultores_empleado_ids: normalizaIdsConsultores(
          p.consultores_empleado_ids || p.consultores?.map((c) => c.id) || []
        ),
      horas_asignadas: String(p.horas_asignadas ?? ''),
      estado: p.estado || 'pendiente',
      detalles: p.detalles || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const abrirEditActividad = (a) => {
    setActividadEditId(a.id);
    setActForm({
      proyecto_id: String(a.proyecto_id),
      requerido_por: a.requerido_por,
      descripcion_actividad: a.descripcion_actividad || '',
      prioridad: a.prioridad || 'media',
      fecha_hora_inicio: sqlADatetimeLocal(a.fecha_hora_inicio),
      fecha_hora_fin: sqlADatetimeLocal(a.fecha_hora_fin),
      estado: a.estado || 'no_iniciado',
      comentarios: a.comentarios || '',
      situacion_pago: a.situacion_pago || 'pendiente'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const labelReq = useCallback((key) => REQUERIDO_POR_OPTS.find((x) => x.value === key)?.label || key, []);
  const labelEstProy = useCallback((key) => EST_PROY.find((x) => x.value === key)?.label || key, []);

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <FolderIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Control de proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">Proyectos, registro de horas y costos (admin).</p>
          </div>
        </div>
        {esAdmin() && (
          <Link
            to="/admin/control-proyectos-costo-hora"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100"
          >
            Costo por hora (consultores)
          </Link>
        )}
        <Link
          to="/control-proyectos/reporte"
          className="text-sm font-medium text-violet-700 hover:text-violet-900 bg-violet-50 px-4 py-2 rounded-xl border border-violet-100"
        >
          Reporte BI
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('proyectos')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === 'proyectos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Proyectos
        </button>
        <button
          type="button"
          onClick={() => setTab('actividades')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === 'actividades' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <ClockIcon className="w-4 h-4" />
          Actividades (registro de horas)
        </button>
      </div>

      {cargando ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <>
          {tab === 'proyectos' && (
            <>
              {!puedeProy ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Solo <strong>administrador</strong> o <strong>Verónica Gonzales</strong> pueden crear o editar proyectos aquí.
                </div>
              ) : (
                <form onSubmit={submitProyecto} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-8 space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {proyectoEditId ? `Editar proyecto #${proyectoEditId}` : 'Nuevo proyecto'}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Empresa *</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={proyForm.empresa}
                        onChange={(e) => setProyForm((f) => ({ ...f, empresa: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto *</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={proyForm.proyecto}
                        onChange={(e) => setProyForm((f) => ({ ...f, proyecto: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Fecha inicio *</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={proyForm.fecha_inicio}
                        onChange={(e) => setProyForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Fecha fin *</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={proyForm.fecha_fin}
                        onChange={(e) => setProyForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-2" htmlFor="cp-consultores-multi">
                        Consultores asignados * <span className="text-slate-400 font-normal">(uno o más del portal)</span>
                      </label>
                      {consultores.length === 0 ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                          No hay lista de empleados. Debes entrar como admin o Verónica para cargar consultores en el
                          formulario.
                        </p>
                      ) : (
                        <>
                          <select
                            id="cp-consultores-multi"
                            multiple
                            size={Math.min(12, Math.max(5, consultores.length))}
                            className="w-full rounded-xl border-2 border-slate-300 bg-white px-2 py-2 text-sm shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-h-[10rem]"
                            value={proyForm.consultores_empleado_ids.map(String)}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, (opt) => Number(opt.value));
                              setProyForm((f) => ({
                                ...f,
                                consultores_empleado_ids: normalizaIdsConsultores(selected)
                              }));
                            }}
                          >
                            {consultores.map((c) => (
                              <option key={c.id} value={String(c.id)}>
                                {c.nombre_completo} ({c.email})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            <strong className="text-slate-700">Selección múltiple:</strong> mantén pulsado{' '}
                            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Ctrl</kbd> (Windows) o{' '}
                            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">Cmd</kbd> (Mac) y haz clic
                            en varias filas. Así se distinguen de un desplegable de una sola opción.
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Personas que no estén en el portal pueden anotarse en «Detalles o comentarios».
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Horas asignadas *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums"
                        value={proyForm.horas_asignadas}
                        onChange={(e) => setProyForm((f) => ({ ...f, horas_asignadas: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={proyForm.estado}
                        onChange={(e) => setProyForm((f) => ({ ...f, estado: e.target.value }))}
                      >
                        {EST_PROY.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Detalles o comentarios</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={proyForm.detalles}
                      onChange={(e) => setProyForm((f) => ({ ...f, detalles: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-xl bg-indigo-600 text-white text-sm font-medium px-6 py-2 hover:bg-indigo-700">
                      {proyectoEditId ? 'Actualizar proyecto' : 'Guardar proyecto'}
                    </button>
                    {proyectoEditId && (
                      <button type="button" onClick={resetProyForm} className="rounded-xl border border-slate-200 px-6 py-2 text-sm font-medium">
                        Cancelar edición
                      </button>
                    )}
                  </div>
                </form>
              )}
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-x-auto">
                <h3 className="text-sm font-semibold text-slate-800 px-6 pt-6 pb-2">Listado de proyectos</h3>
                {!puedeProy ? (
                  <p className="px-6 pb-6 text-sm text-slate-500">No tienes permiso para ver todos los proyectos.</p>
                ) : proyectos.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-slate-500">Sin proyectos cargados.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Empresa</th>
                        <th className="px-4 py-2 text-left">Proyecto</th>
                        <th className="px-4 py-2 text-left whitespace-nowrap">Inicio–Fin</th>
                        <th className="px-4 py-2 text-left">Consultores</th>
                        <th className="px-4 py-2 text-right">Hrs.</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                        {puedeProy && <th className="px-4 py-2 text-left w-28">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proyectos.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-2">{p.empresa}</td>
                          <td className="px-4 py-2 font-medium">{p.proyecto}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-xs">
                            {formatoFechaDMY(p.fecha_inicio)} – {formatoFechaDMY(p.fecha_fin)}
                          </td>
                          <td className="px-4 py-2 text-xs max-w-xs">{p.consultores_nombres || '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{Number(p.horas_asignadas).toFixed(2)}</td>
                          <td className="px-4 py-2">{labelEstProy(p.estado)}</td>
                          {puedeProy && (
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                className="text-indigo-600 text-xs font-medium hover:underline"
                                onClick={() => abrirEditProyecto(p)}
                              >
                                Editar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'actividades' && (
            <>
              <form onSubmit={submitActividad} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-8 space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  {actividadEditId ? `Editar actividad #${actividadEditId}` : 'Registro de horas'}
                </h2>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-sm">
                  <span className="text-slate-500">Consultor (usted): </span>
                  <strong className="text-slate-800">{nombreUsuario || usuario?.email}</strong>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto *</label>
                    <select
                      required
                      className="w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.proyecto_id}
                      onChange={(e) => setActForm((f) => ({ ...f, proyecto_id: e.target.value }))}
                    >
                      <option value="">Solo aparecen proyectos donde está asignado</option>
                      {misProyectos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.empresa} — {p.proyecto}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Requerido por *</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.requerido_por}
                      onChange={(e) => setActForm((f) => ({ ...f, requerido_por: e.target.value }))}
                    >
                      {REQUERIDO_POR_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad *</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.prioridad}
                      onChange={(e) => setActForm((f) => ({ ...f, prioridad: e.target.value }))}
                    >
                      {PRIOR.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha y hora inicio *</label>
                    <input
                      type="datetime-local"
                      step={60}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.fecha_hora_inicio}
                      onChange={(e) => setActForm((f) => ({ ...f, fecha_hora_inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha y hora fin *</label>
                    <input
                      type="datetime-local"
                      step={60}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.fecha_hora_fin}
                      onChange={(e) => setActForm((f) => ({ ...f, fecha_hora_fin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Horas trabajadas (calculadas)</label>
                    <input
                      readOnly
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 tabular-nums"
                      value={horasPreviewAct != null ? String(horasPreviewAct) : '—'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.estado}
                      onChange={(e) => setActForm((f) => ({ ...f, estado: e.target.value }))}
                    >
                      {EST_ACT.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Situación de pago *</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.situacion_pago}
                      onChange={(e) => setActForm((f) => ({ ...f, situacion_pago: e.target.value }))}
                    >
                      {SIT_PAGO.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descripción de actividad *</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.descripcion_actividad}
                      onChange={(e) => setActForm((f) => ({ ...f, descripcion_actividad: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={actForm.comentarios}
                      onChange={(e) => setActForm((f) => ({ ...f, comentarios: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-xl bg-indigo-600 text-white text-sm font-medium px-6 py-2 hover:bg-indigo-700">
                    {actividadEditId ? 'Actualizar actividad' : 'Registrar actividad'}
                  </button>
                  {actividadEditId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActividadEditId(null);
                        setActForm(actividadVacia());
                      }}
                      className="rounded-xl border border-slate-200 px-6 py-2 text-sm font-medium"
                    >
                      Nueva actividad
                    </button>
                  )}
                </div>
              </form>

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">Mis actividades</h3>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    value={filtroProyectoAct}
                    onChange={(e) => setFiltroProyectoAct(e.target.value)}
                  >
                    <option value="">Todos mis proyectos</option>
                    {misProyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.proyecto}
                      </option>
                    ))}
                  </select>
                </div>
                {actividades.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No hay registros.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-left">Proyecto</th>
                          <th className="px-4 py-2 text-left">Req. por</th>
                          <th className="px-4 py-2 text-left whitespace-nowrap">Inicio–Fin</th>
                          <th className="px-4 py-2 text-right">Hrs</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                          <th className="px-4 py-2 text-left">Pago</th>
                          <th className="px-4 py-2 text-left">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {actividades.map((a) => (
                          <tr key={a.id}>
                            <td className="px-4 py-2 max-w-[200px]" title={`${a.empresa_nombre} · ${a.proyecto_nombre}`}>
                              <div className="font-medium truncate">{a.proyecto_nombre}</div>
                              <div className="text-xs text-slate-500 truncate">{a.empresa_nombre}</div>
                            </td>
                            <td className="px-4 py-2 text-xs">{labelReq(a.requerido_por)}</td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">
                              {formatoFechaHoraDMY(a.fecha_hora_inicio)}
                              <br />
                              {formatoFechaHoraDMY(a.fecha_hora_fin)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{Number(a.horas_trabajadas).toFixed(2)}</td>
                            <td className="px-4 py-2">{EST_ACT.find((x) => x.value === a.estado)?.label}</td>
                            <td className="px-4 py-2">{SIT_PAGO.find((x) => x.value === a.situacion_pago)?.label}</td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                className="text-indigo-600 text-xs font-medium hover:underline"
                                onClick={() => abrirEditActividad(a)}
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ControlProyectos;
