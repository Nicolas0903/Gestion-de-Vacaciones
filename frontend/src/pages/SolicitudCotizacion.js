import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cotizacionSolicitudesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { tiposProyectoOpciones } from '../utils/cotizacionTiposProyecto';

const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviada: 'Enviada al equipo',
  en_elaboracion: 'En elaboración',
  atendida: 'Atendida',
  cancelada: 'Cancelada'
};

const emptyForm = () => ({
  nombre_proyecto: '',
  cliente: '',
  tipos_codigos: [],
  fecha_limite: '',
  contexto_comercial: '',
  responsables_ids: []
});

function tiposCodigosDesdeRow(row) {
  if (Array.isArray(row?.tipos_proyecto) && row.tipos_proyecto.length) {
    return row.tipos_proyecto.map((t) => t.codigo).filter(Boolean);
  }
  if (row?.tipo_proyecto_codigo) return [row.tipo_proyecto_codigo];
  return [];
}

function responsablesIdsDesdeRow(row) {
  if (Array.isArray(row?.responsables_ids) && row.responsables_ids.length) {
    return row.responsables_ids.map(String);
  }
  if (row?.responsable_id) return [String(row.responsable_id)];
  return [];
}

const SolicitudCotizacion = () => {
  const { usuario } = useAuth();
  const [lista, setLista] = useState([]);
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [responsables, setResponsables] = useState([]);
  const tipos = tiposProyectoOpciones();

  const cargar = useCallback(async () => {
    try {
      const { data } = await cotizacionSolicitudesService.listar();
      setLista(data.data || []);
    } catch {
      toast.error('No se pudieron cargar solicitudes');
    }
  }, []);

  useEffect(() => {
    cargar();
    cotizacionSolicitudesService.responsables().then(({ data }) => setResponsables(data.data || [])).catch(() => {});
  }, [cargar]);

  useEffect(() => {
    if (!selId) {
      setForm(emptyForm());
      return;
    }
    const row = lista.find((x) => x.id === selId);
    if (!row) return;
    setForm({
      nombre_proyecto: row.nombre_proyecto || '',
      cliente: row.cliente || '',
      tipos_codigos: tiposCodigosDesdeRow(row),
      fecha_limite: row.fecha_limite ? String(row.fecha_limite).slice(0, 10) : '',
      contexto_comercial: row.contexto_comercial || '',
      responsables_ids: responsablesIdsDesdeRow(row)
    });
  }, [selId, lista]);

  const sel = lista.find((x) => x.id === selId);
  const soloLectura = sel && !['borrador'].includes(sel.estado);

  const toggleTipo = (codigo) => {
    if (soloLectura) return;
    setForm((f) => {
      const set = new Set(f.tipos_codigos);
      if (set.has(codigo)) set.delete(codigo);
      else set.add(codigo);
      return { ...f, tipos_codigos: [...set] };
    });
  };

  const toggleResponsable = (id) => {
    if (soloLectura) return;
    const sid = String(id);
    setForm((f) => {
      const set = new Set(f.responsables_ids);
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return { ...f, responsables_ids: [...set] };
    });
  };

  const payload = () => {
    const tipos_proyecto = form.tipos_codigos.map((codigo) => {
      const t = tipos.find((x) => x.codigo === codigo);
      return { codigo, nombre: t?.nombre || '' };
    });
    const first = tipos_proyecto[0];
    return {
      nombre_proyecto: form.nombre_proyecto,
      cliente: form.cliente,
      fecha_limite: form.fecha_limite,
      contexto_comercial: form.contexto_comercial,
      tipos_proyecto,
      responsables_ids: form.responsables_ids.map(Number).filter(Boolean),
      tipo_proyecto: first?.nombre || '',
      tipo_proyecto_codigo: first?.codigo || '',
      responsable_id: form.responsables_ids[0] ? Number(form.responsables_ids[0]) : ''
    };
  };

  const guardar = async (enviar = false) => {
    if (enviar && !form.tipos_codigos.length) {
      toast.error('Selecciona al menos un tipo de proyecto');
      return;
    }
    if (enviar && !form.responsables_ids.length) {
      toast.error('Selecciona al menos un responsable para elaborar la cotización');
      return;
    }
    setGuardando(true);
    try {
      if (selId) {
        const { data } = await cotizacionSolicitudesService.actualizar(selId, {
          ...payload(),
          enviar
        });
        toast.success(
          enviar ? 'Solicitud enviada. Los responsables seleccionados recibirán un correo.' : 'Borrador guardado'
        );
        await cargar();
        setSelId(data.data.id);
      } else {
        const { data } = await cotizacionSolicitudesService.crear({ ...payload(), enviar });
        toast.success(
          enviar ? 'Solicitud enviada. Los responsables seleccionados recibirán un correo.' : 'Borrador creado'
        );
        await cargar();
        setSelId(data.data.id);
      }
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  /** Sin fila en cotizaciones (estado huérfano "en elaboración"). */
  const sinCotizacionReal = sel && !sel.cotizacion_codigo;

  const anularSolicitud = async () => {
    if (!selId || !sel) return;
    const motivo = window.prompt('Motivo de anulación (opcional):') ?? '';
    if (motivo === null) return;
    setGuardando(true);
    try {
      await cotizacionSolicitudesService.cancelar(selId, { motivo });
      toast.success('Solicitud anulada');
      await cargar();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo anular');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarSolicitud = async () => {
    if (!selId || !sel) return;
    if (!window.confirm(`¿Eliminar ${sel.codigo} permanentemente?`)) return;
    setGuardando(true);
    try {
      await cotizacionSolicitudesService.eliminar(selId);
      toast.success('Solicitud eliminada');
      setSelId(null);
      await cargar();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo eliminar');
    } finally {
      setGuardando(false);
    }
  };
  const nombreSolicitante =
    sel?.solicitante_nombre ||
    [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') ||
    '—';
  const emailSolicitante = sel?.solicitante_email || usuario?.email || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> Portal
        </Link>

        <h1 className="text-2xl font-bold text-slate-800">Solicitud de cotización</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Completa la información comercial. Puedes marcar <strong>uno o varios</strong> tipos de proyecto y{' '}
          <strong>uno o varios</strong> responsables; al enviar, cada responsable seleccionado recibe el correo.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4">
            <button
              type="button"
              onClick={() => setSelId(null)}
              className="mb-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm"
            >
              <PlusIcon className="w-4 h-4" /> Nueva solicitud
            </button>
            <div className="bg-white rounded-2xl border divide-y max-h-[70vh] overflow-y-auto">
              {lista.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelId(s.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selId === s.id ? 'bg-teal-50' : ''}`}
                >
                  <div className="font-medium text-sm">{s.codigo}</div>
                  <div className="text-xs text-slate-500 truncate">{s.nombre_proyecto}</div>
                  <div className="text-xs mt-1 text-teal-700">{ESTADO_LABEL[s.estado] || s.estado}</div>
                  {(s.responsables_texto || s.responsable_nombre) && (
                    <div className="text-xs text-slate-400 truncate">
                      → {s.responsables_texto || s.responsable_nombre}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </aside>

          <main className="lg:col-span-8 bg-white rounded-2xl border p-5 md:p-6 space-y-4">
            {sel && (
              <div className="text-sm text-slate-600">
                <strong>{sel.codigo}</strong> · {ESTADO_LABEL[sel.estado]}
                {sel.cotizacion_codigo && (
                  <span className="ml-2 text-teal-700">→ Cotización {sel.cotizacion_codigo}</span>
                )}
              </div>
            )}

            <label className="block text-sm">
              <span className="text-slate-600">Nombre del proyecto *</span>
              <input
                value={form.nombre_proyecto}
                readOnly={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, nombre_proyecto: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Cliente *</span>
              <input
                value={form.cliente}
                readOnly={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <fieldset className="block text-sm" disabled={soloLectura}>
              <legend className="text-slate-600 mb-2">Tipo(s) de proyecto *</legend>
              <div className="mt-1 rounded-lg border divide-y max-h-48 overflow-y-auto">
                {tipos.map((t) => (
                  <label
                    key={t.codigo}
                    className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-slate-300"
                      checked={form.tipos_codigos.includes(t.codigo)}
                      onChange={() => toggleTipo(t.codigo)}
                    />
                    <span className="text-slate-800">{t.nombre}</span>
                  </label>
                ))}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">Marca uno o varios según el alcance.</span>
            </fieldset>
            <label className="block text-sm">
              <span className="text-slate-600">Fecha límite (opcional)</span>
              <input
                type="date"
                value={form.fecha_limite}
                readOnly={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, fecha_limite: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Contexto para el equipo *</span>
              <textarea
                rows={4}
                value={form.contexto_comercial}
                readOnly={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, contexto_comercial: e.target.value }))}
                placeholder="Alcance, urgencia, competencia, expectativa del cliente…"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <fieldset className="block text-sm" disabled={soloLectura}>
              <legend className="text-slate-600 mb-2">Responsable(s) requerido(s) *</legend>
              <div className="mt-1 rounded-lg border divide-y max-h-48 overflow-y-auto">
                {responsables.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-slate-300"
                      checked={form.responsables_ids.includes(String(r.id))}
                      onChange={() => toggleResponsable(r.id)}
                    />
                    <span className="text-slate-800">
                      {[r.nombres, r.apellidos].filter(Boolean).join(' ')}
                      {r.email ? <span className="text-slate-500 text-xs block">{r.email}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Cada persona marcada recibe el correo al enviar y puede elaborar la cotización en su módulo.
              </span>
            </fieldset>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">Comercial que solicita</p>
              <p className="font-medium text-slate-800">{nombreSolicitante}</p>
              {emailSolicitante && <p className="text-slate-600 mt-0.5 text-xs">{emailSolicitante}</p>}
            </div>

            {!soloLectura && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => guardar(false)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Guardar borrador
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => guardar(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm"
                >
                  <PaperAirplaneIcon className="w-4 h-4" /> Enviar al equipo
                </button>
                {sel?.estado === 'borrador' && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={eliminarSolicitud}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm"
                  >
                    Eliminar borrador
                  </button>
                )}
              </div>
            )}

            {(sel?.estado === 'enviada' || (sel?.estado === 'en_elaboracion' && sinCotizacionReal)) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={eliminarSolicitud}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium"
                >
                  Eliminar solicitud
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={anularSolicitud}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 text-sm"
                >
                  Anular envío
                </button>
                <p className="text-xs text-slate-500 w-full">
                  {sinCotizacionReal
                    ? 'No hay cotización en el módulo Cotizaciones. Puede eliminar esta solicitud del listado.'
                    : 'Anular deja la solicitud como cancelada; eliminar la borra permanentemente.'}
                </p>
              </div>
            )}

            {sel?.estado === 'en_elaboracion' && sel.cotizacion_codigo && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <Link
                  to="/cotizaciones"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white text-sm"
                >
                  Ir al módulo Cotizaciones
                </Link>
                <p className="text-xs text-slate-600 w-full">
                  Cotización vinculada: <strong>{sel.cotizacion_codigo}</strong>. Elimínela allí para poder borrar
                  esta solicitud.
                </p>
              </div>
            )}

            {sel?.estado === 'cancelada' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={eliminarSolicitud}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm"
                >
                  Eliminar del listado
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SolicitudCotizacion;
