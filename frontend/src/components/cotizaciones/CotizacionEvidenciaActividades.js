import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';

const fmtBytes = (n) => {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const CotizacionEvidenciaActividades = ({ cotizacionId }) => {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [comentario, setComentario] = useState('');

  const cargar = useCallback(async () => {
    if (!cotizacionId) return;
    setCargando(true);
    try {
      const { data } = await cotizacionesService.listarAdjuntos(cotizacionId, {
        tipo: 'evidencia_criterio'
      });
      setLista(data.data || []);
    } catch {
      toast.error('No se pudo cargar evidencias');
    } finally {
      setCargando(false);
    }
  }, [cotizacionId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !cotizacionId) return;
    setSubiendo(true);
    try {
      await cotizacionesService.subirAdjunto(cotizacionId, file, comentario.trim(), 'evidencia_criterio');
      setComentario('');
      toast.success('Evidencia adjuntada');
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (adjuntoId) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
    try {
      await cotizacionesService.eliminarAdjunto(cotizacionId, adjuntoId);
      toast.success('Eliminado');
      await cargar();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const descargar = async (adjuntoId, nombreOriginal) => {
    const url = cotizacionesService.descargarAdjuntoUrl(cotizacionId, adjuntoId);
    const t = localStorage.getItem('token');
    try {
      const res = await fetch(url, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
      if (!res.ok) throw new Error('download');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombreOriginal || 'evidencia';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('No se pudo descargar');
    }
  };

  if (!cotizacionId) return null;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-violet-950 flex items-center gap-2">
          <PaperClipIcon className="w-4 h-4" /> Evidencia del criterio (dimensionamiento)
        </h4>
        <p className="text-xs text-violet-900/75 mt-1">
          Adjunta archivos (correos, actas, criterios del cliente, etc.) que respalden perfiles y horas.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-slate-600 flex-1 min-w-[200px]">
          Comentario (opcional)
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm bg-white"
            placeholder="Ej. Criterio acordado con ADEX"
          />
        </label>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-700 text-white text-sm font-medium cursor-pointer hover:bg-violet-800">
          <input type="file" className="hidden" disabled={subiendo} onChange={onFile} />
          {subiendo ? 'Subiendo…' : 'Adjuntar evidencia'}
        </label>
      </div>
      <div className="rounded-lg border bg-white divide-y text-sm max-h-40 overflow-y-auto">
        {cargando && <p className="p-3 text-slate-500">Cargando…</p>}
        {!cargando && lista.length === 0 && (
          <p className="p-3 text-slate-500">Sin evidencias aún.</p>
        )}
        {lista.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0 truncate font-medium text-slate-800">{a.nombre_original}</div>
            <span className="text-xs text-slate-400 shrink-0">{fmtBytes(a.tamano_bytes)}</span>
            <button
              type="button"
              onClick={() => descargar(a.id, a.nombre_original)}
              className="p-1.5 rounded border hover:bg-slate-50 text-teal-700"
              title="Descargar"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => eliminar(a.id)}
              className="p-1.5 rounded border border-red-100 text-red-600 hover:bg-red-50"
              title="Eliminar"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CotizacionEvidenciaActividades;
