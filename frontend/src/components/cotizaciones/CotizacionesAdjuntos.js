import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';

const fmtBytes = (n) => {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const CotizacionesAdjuntos = ({ cotizacionId, codigo, onSolicitudEnviada }) => {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [comentarioEnvio, setComentarioEnvio] = useState('');
  const [comentarioArchivo, setComentarioArchivo] = useState('');

  const cargar = useCallback(async () => {
    if (!cotizacionId) return;
    setCargando(true);
    try {
      const { data } = await cotizacionesService.listarAdjuntos(cotizacionId);
      setLista(data.data || []);
    } catch {
      toast.error('No se pudieron cargar adjuntos');
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
      await cotizacionesService.subirAdjunto(cotizacionId, file, comentarioArchivo.trim());
      setComentarioArchivo('');
      toast.success('Archivo subido');
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (adjuntoId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
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
      a.download = nombreOriginal || 'adjunto';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('No se pudo descargar');
    }
  };

  const enviarAprobacion = async () => {
    if (!window.confirm('¿Enviar a aprobación? Se notificará por correo a los responsables (aprobador).')) {
      return;
    }
    setSubiendo(true);
    try {
      const { data } = await cotizacionesService.solicitarAprobacion(cotizacionId, {
        comentario: comentarioEnvio.trim()
      });
      toast.success(data.mensaje || 'Enviado a aprobación');
      setComentarioEnvio('');
      onSolicitudEnviada?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al enviar');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">Adjuntos</h3>
        <p className="text-sm text-slate-500 mt-1">
          {codigo} · PDF, Excel, Word, imágenes o ZIP (máx. 15 MB c/u). Al enviar a aprobación, los responsables
          reciben correo con los archivos (hasta ~8 MB total en el mail).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <label className="block text-sm text-slate-600">
          Comentario del archivo (opcional)
          <input
            value={comentarioArchivo}
            onChange={(e) => setComentarioArchivo(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
            placeholder="Ej. Propuesta v3 para cliente"
          />
        </label>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-teal-300 text-teal-800 text-sm font-medium cursor-pointer hover:bg-teal-50">
          <input type="file" className="hidden" disabled={subiendo} onChange={onFile} />
          {subiendo ? 'Subiendo…' : 'Seleccionar archivo'}
        </label>
      </div>

      <div className="rounded-xl border divide-y overflow-hidden">
        {cargando && <p className="p-4 text-sm text-slate-500">Cargando…</p>}
        {!cargando && lista.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Sin archivos adjuntos aún.</p>
        )}
        {lista.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{a.nombre_original}</div>
              <div className="text-xs text-slate-500">
                {fmtBytes(a.tamano_bytes)} · {a.subido_por_nombre || '—'} ·{' '}
                {a.created_at ? String(a.created_at).slice(0, 16).replace('T', ' ') : ''}
              </div>
              {a.comentario && <div className="text-xs text-slate-600 mt-0.5">{a.comentario}</div>}
            </div>
            <button
              type="button"
              onClick={() => descargar(a.id, a.nombre_original)}
              className="p-2 rounded-lg border hover:bg-slate-50 text-teal-700"
              title="Descargar"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => eliminar(a.id)}
              className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
              title="Eliminar"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
        <h4 className="font-semibold text-amber-950 text-sm">Enviar a aprobación</h4>
        <p className="text-xs text-amber-900/80">
          Cambia el estado a <strong>En revisión</strong> y envía correo a los demás responsables de la cotización
          (aprobador).
        </p>
        <textarea
          rows={2}
          value={comentarioEnvio}
          onChange={(e) => setComentarioEnvio(e.target.value)}
          placeholder="Mensaje para el aprobador (opcional)"
          className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white"
        />
        <button
          type="button"
          disabled={subiendo}
          onClick={enviarAprobacion}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <PaperAirplaneIcon className="w-4 h-4" /> Notificar aprobador
        </button>
      </div>
    </div>
  );
};

export default CotizacionesAdjuntos;
