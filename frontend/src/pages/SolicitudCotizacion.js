import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cotizacionSolicitudesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parcheGeneralTipoProyectoDesdeNombre, tiposProyectoOpciones } from '../utils/cotizacionTiposProyecto';

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
  tipo_proyecto: '',
  tipo_proyecto_codigo: '',
  fecha_limite: '',
  contexto_comercial: '',
  responsable_id: ''
});

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
      tipo_proyecto: row.tipo_proyecto || '',
      tipo_proyecto_codigo: row.tipo_proyecto_codigo || '',
      fecha_limite: row.fecha_limite ? String(row.fecha_limite).slice(0, 10) : '',
      contexto_comercial: row.contexto_comercial || '',
      responsable_id: row.responsable_id ? String(row.responsable_id) : ''
    });
  }, [selId, lista]);

  const payload = () => ({ ...form });

  const guardar = async (enviar = false) => {
    if (enviar && !form.responsable_id) {
      toast.error('Selecciona al responsable que debe elaborar la cotización');
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
          enviar ? 'Solicitud enviada. El responsable recibirá un correo.' : 'Borrador guardado'
        );
        await cargar();
        setSelId(data.data.id);
      } else {
        const { data } = await cotizacionSolicitudesService.crear({ ...payload(), enviar });
        toast.success(
          enviar ? 'Solicitud enviada. El responsable recibirá un correo.' : 'Borrador creado'
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

  const sel = lista.find((x) => x.id === selId);
  const soloLectura = sel && !['borrador'].includes(sel.estado);

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
          Completa la información comercial y elige quién debe elaborar la cotización. Al enviar,{' '}
          <strong>solo ese responsable</strong> recibe el correo con el detalle.
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
                  {s.responsable_nombre && (
                    <div className="text-xs text-slate-400 truncate">→ {s.responsable_nombre}</div>
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
            <label className="block text-sm">
              <span className="text-slate-600">Tipo de proyecto *</span>
              <select
                value={form.tipo_proyecto || ''}
                disabled={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, ...parcheGeneralTipoProyectoDesdeNombre(e.target.value) }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Seleccionar…</option>
                {tipos.map((t) => (
                  <option key={t.codigo} value={t.nombre}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="block text-sm">
              <span className="text-slate-600">Responsable requerido *</span>
              <select
                value={form.responsable_id}
                disabled={soloLectura}
                onChange={(e) => setForm((f) => ({ ...f, responsable_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Seleccionar responsable…</option>
                {responsables.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {[r.nombres, r.apellidos].filter(Boolean).join(' ')}
                    {r.email ? ` · ${r.email}` : ''}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 mt-1 block">
                Esta persona recibe el correo al enviar la solicitud y elabora la cotización en el módulo correspondiente.
              </span>
            </label>

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

            {sel?.estado === 'enviada' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={anularSolicitud}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-amber-900 text-sm"
                >
                  Anular envío
                </button>
                <p className="text-xs text-slate-500 w-full">
                  Quita la solicitud de la bandeja del responsable (estado cancelada).
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
