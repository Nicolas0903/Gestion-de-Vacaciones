import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowLeftIcon,
  PaperClipIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { rendicionPresupuestoService } from '../services/api';
import {
  RENDICION_PRESUPUESTO_MAX_UPLOAD_MB,
  RENDICION_PRESUPUESTO_MAX_FILE_BYTES
} from '../config/rendicionPresupuestoUpload';
import { formatoFechaDMY, formatoFechaHoraDMY } from '../utils/dateUtils';
import { formatoMontoRendicion, MONEDAS_RENDICION } from '../utils/monedaRendicion';

const estadoBadge = (e) => {
  const map = {
    pendiente: 'bg-amber-100 text-amber-800',
    aprobado: 'bg-emerald-100 text-emerald-800',
    rechazado: 'bg-rose-100 text-rose-800',
    observado: 'bg-sky-100 text-sky-900'
  };
  return map[e] || 'bg-slate-100 text-slate-700';
};

const estadoLabel = (e) =>
  ({
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    observado: 'Observado'
  }[e] || e);

const AREAS_FALLBACK = [
  { value: 'gerencia_general', label: 'Gerencia General' },
  { value: 'consultoria', label: 'Consultoría' },
  { value: 'administracion', label: 'Administración' },
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'comercial', label: 'Comercial' }
];

function descargarBlob(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  window.URL.revokeObjectURL(url);
}

const RendicionPresupuesto = () => {
  const { usuario, esAdmin } = useAuth();
  const puedeGestionar = esAdmin && esAdmin();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [areas, setAreas] = useState(AREAS_FALLBACK);

  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [area, setArea] = useState('');
  const [concepto, setConcepto] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('PEN');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [eliminandoId, setEliminandoId] = useState(null);

  const nombreCompleto = `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim();

  const puedeEliminar = (r) => {
    if (!r) return false;
    if (puedeGestionar) return true;
    return r.estado !== 'aprobado';
  };
  const dni = usuario?.dni || '—';

  const areaLabelOf = (v) => areas.find((a) => a.value === v)?.label || v;

  const resetFormulario = () => {
    setFechaSolicitud('');
    setArea('');
    setConcepto('');
    setArchivo(null);
    setMonto('');
    setMoneda('PEN');
    setFileInputKey((k) => k + 1);
  };

  const cargarLista = async () => {
    setLoading(true);
    try {
      const { data } = await rendicionPresupuestoService.misSolicitudes();
      setLista(data.data || []);
    } catch {
      toast.error('No se pudieron cargar tus rendiciones.');
    } finally {
      setLoading(false);
    }
  };

  const cargarAreas = async () => {
    try {
      const { data } = await rendicionPresupuestoService.areas();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        setAreas(data.data);
      }
    } catch {
      // Si falla, usamos AREAS_FALLBACK; no toast, es secundario.
    }
  };

  useEffect(() => {
    cargarLista();
    cargarAreas();
  }, []);

  const eliminarRegistro = async (r) => {
    if (!puedeEliminar(r)) return;
    const codigo = r.codigo_ticket || `RDP-${r.id}`;
    if (
      !window.confirm(
        `¿Eliminar definitivamente la rendición ${codigo}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setEliminandoId(r.id);
    try {
      await rendicionPresupuestoService.eliminar(r.id);
      toast.success('Rendición eliminada.');
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    } finally {
      setEliminandoId(null);
    }
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!fechaSolicitud || !concepto.trim()) {
      toast.error('Complete la fecha y el concepto.');
      return;
    }
    if (!area) {
      toast.error('Seleccione el área que realizó el consumo.');
      return;
    }
    const montoNum = parseFloat(String(monto).replace(',', '.'), 10);
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      toast.error('Indique un monto mayor a cero.');
      return;
    }
    if (archivo && archivo.size > RENDICION_PRESUPUESTO_MAX_FILE_BYTES) {
      toast.error(
        `El archivo supera los ${RENDICION_PRESUPUESTO_MAX_UPLOAD_MB} MB permitidos (${(archivo.size / (1024 * 1024)).toFixed(1)} MB). Comprímalo e inténtelo de nuevo.`
      );
      return;
    }

    const fd = new FormData();
    fd.append('fecha_solicitud_usuario', fechaSolicitud);
    fd.append('area', area);
    fd.append('concepto', concepto.trim());
    fd.append('monto', String(montoNum));
    fd.append('moneda', moneda);
    if (archivo) {
      fd.append('comprobante', archivo);
    }

    setEnviando(true);
    try {
      await rendicionPresupuestoService.crear(fd);
      toast.success('Rendición registrada. Se notificó a los responsables.');
      resetFormulario();
      cargarLista();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo enviar la rendición.';
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  const bajarComprobante = async (id, codigo) => {
    try {
      const res = await rendicionPresupuestoService.descargarComprobante(id);
      descargarBlob(res.data, `comprobante-${codigo}`);
    } catch {
      toast.error('No se pudo descargar el comprobante.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-8">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver al portal
        </Link>
        {puedeGestionar && (
          <Link
            to="/rendicion-presupuesto/gestion"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            title="Ir al panel de gestión (admin)"
          >
            <Cog6ToothIcon className="w-4 h-4" />
            Gestionar
          </Link>
        )}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center shadow-lg shadow-teal-500/25 mb-6">
          <BanknotesIcon className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Rendición de Presupuesto</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Reembolsos y rendición de gastos por área. Los datos de nombre y DNI se toman de tu cuenta.
          El ID de ticket y la fecha de registro se generan al enviar.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
              <input
                type="text"
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700"
                value={nombreCompleto}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input
                type="text"
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700"
                value={dni}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del recibo / gasto *</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                value={fechaSolicitud}
                onChange={(e) => setFechaSolicitud(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Área que realizó el consumo *</label>
              <select
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">Seleccione un área…</option>
                {areas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto / motivo *</label>
            <textarea
              required
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
              placeholder="Describe el gasto, motivo o destino del desembolso"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda *</label>
              <select
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
              >
                {MONEDAS_RENDICION.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Importe en {moneda === 'USD' ? 'dólares americanos' : 'soles peruanos'}.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adjuntar archivo <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <label
              htmlFor="rdp-archivo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-700 text-sm font-medium cursor-pointer hover:bg-slate-100 hover:border-teal-400 transition-colors"
            >
              <PaperClipIcon className="w-4 h-4 shrink-0" />
              {archivo ? 'Cambiar archivo' : 'Adjuntar comprobante o nota'}
            </label>
            <input
              key={fileInputKey}
              id="rdp-archivo"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
              className="sr-only"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            />
            {archivo ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 font-medium">
                  <PaperClipIcon className="w-3.5 h-3.5" />
                  <span className="break-all">{archivo.name}</span>
                </span>
                <button
                  type="button"
                  className="text-rose-600 hover:underline font-medium"
                  onClick={() => {
                    setArchivo(null);
                    setFileInputKey((k) => k + 1);
                  }}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                Si tenés un comprobante, factura o nota relacionada podés adjuntarlo. No es obligatorio.
                Tamaño máximo <strong className="font-medium text-slate-600">{RENDICION_PRESUPUESTO_MAX_UPLOAD_MB} MB</strong>
                {' '}(PDF, imagen o Word).
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 text-white font-medium px-8 py-3 shadow-lg shadow-teal-500/25 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar rendición'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Mis rendiciones</h2>
        <p className="text-xs text-slate-500 mb-4">
          Puedes eliminar tus rendiciones en estado pendiente, rechazado u observado. Las aprobadas solo las elimina
          administración.
        </p>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-slate-500 text-sm">Aún no hay rendiciones registradas.</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{r.codigo_ticket}</p>
                  <p className="text-xs text-slate-500">
                    Registro: {r.fecha_registro_ticket ? formatoFechaHoraDMY(r.fecha_registro_ticket) : '—'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wide bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full mr-2">
                      {r.area_label || areaLabelOf(r.area)}
                    </span>
                    <span className="text-slate-700 line-clamp-2 align-middle">{r.concepto}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Fecha gasto: {formatoFechaDMY(r.fecha_solicitud_usuario)} · Monto:{' '}
                    {r.monto_formateado || formatoMontoRendicion(r.monto, r.moneda)}
                  </p>
                  <details className="mt-2 text-xs text-slate-600">
                    <summary className="cursor-pointer text-sky-600 font-medium select-none">Ver todos los datos</summary>
                    <dl className="mt-2 grid gap-1.5 sm:grid-cols-2 border border-slate-100 rounded-xl p-3 bg-slate-50/80">
                      <dt className="text-slate-500">Área</dt>
                      <dd className="text-slate-800">{r.area_label || areaLabelOf(r.area) || '—'}</dd>
                      <dt className="text-slate-500">Nombre</dt>
                      <dd className="text-slate-800">{r.nombre_completo || '—'}</dd>
                      <dt className="text-slate-500">DNI</dt>
                      <dd className="font-mono">{r.dni || '—'}</dd>
                      <dt className="text-slate-500">Archivo adjunto</dt>
                      <dd className="break-all">
                        {r.archivo_comprobante_nombre || <span className="text-slate-400">Sin archivo</span>}
                      </dd>
                    </dl>
                  </details>
                  {r.comentarios_resolucion &&
                    ['aprobado', 'rechazado', 'observado'].includes(r.estado) && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                        <span className="font-medium text-slate-700">Observaciones: </span>
                        {r.comentarios_resolucion}
                      </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadge(r.estado)}`}>
                    {estadoLabel(r.estado)}
                  </span>
                  {r.archivo_comprobante_path && (
                    <button
                      type="button"
                      onClick={() => bajarComprobante(r.id, r.codigo_ticket)}
                      className="text-xs font-medium text-sky-600 hover:underline"
                    >
                      Ver archivo
                    </button>
                  )}
                  {puedeEliminar(r) && (
                    <button
                      type="button"
                      disabled={eliminandoId === r.id}
                      onClick={() => eliminarRegistro(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                      title={
                        puedeGestionar
                          ? 'Eliminar rendición (administrador)'
                          : 'Eliminar esta rendición'
                      }
                    >
                      <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                      {eliminandoId === r.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RendicionPresupuesto;
