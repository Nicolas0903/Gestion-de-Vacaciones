import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  EnvelopeIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { backupsService } from '../services/api';
import { formatoFechaHoraDMY } from '../utils/dateUtils';

const formatearBytes = (bytes) => {
  if (bytes == null || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const badgeEstado = (estado) => {
  if (estado === 'ok') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (estado === 'parcial') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-red-100 text-red-800';
};

const ArchivoRespaldos = () => {
  const [lista, setLista] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await backupsService.listar();
      setLista(data.data || []);
      setMeta(data.meta || null);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cargar respaldos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const descargarArchivo = async (id, tipo, nombreFallback) => {
    setDescargandoId(`${id}-${tipo}`);
    try {
      const res = await backupsService.descargar(id, tipo);
      const mime =
        tipo === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/sql';
      const blob = new Blob([res.data], { type: mime });
      const cd = res.headers['content-disposition'];
      let nombre = nombreFallback;
      if (cd) {
        const m = cd.match(/filename="?([^";\n]+)"?/i);
        if (m) nombre = m[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo descargar el archivo.');
    } finally {
      setDescargandoId(null);
    }
  };

  const ejecutarAhora = async (turno) => {
    if (
      !window.confirm(
        `¿Generar respaldo manual ahora (${turno === 'manana' ? 'turno mañana' : 'turno tarde'})? Se enviará correo si SMTP está configurado.`
      )
    ) {
      return;
    }
    setEjecutando(true);
    try {
      const { data } = await backupsService.ejecutar({ turno });
      toast.success(data.mensaje || 'Respaldo generado.');
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo ejecutar el respaldo.');
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <Link
            to="/portal"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-2"
          >
            <Squares2X2Icon className="w-4 h-4" />
            Volver al portal
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArchiveBoxIcon className="w-8 h-8 text-slate-600" />
            Archivo / Respaldos
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            Copias automáticas legibles en Excel (varias hojas por módulo) y volcado SQL técnico.
            Se generan a las <strong>08:30</strong> y <strong>17:30</strong> (hora Perú) y se envían
            por correo como copia fuera del servidor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => ejecutarAhora('manana')}
            disabled={ejecutando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${ejecutando ? 'animate-spin' : ''}`} />
            Respaldo ahora (mañana)
          </button>
          <button
            type="button"
            onClick={() => ejecutarAhora('tarde')}
            disabled={ejecutando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Respaldo ahora (tarde)
          </button>
        </div>
      </div>

      {meta && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
            <ClockIcon className="w-6 h-6 text-teal-600 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">Horario automático</p>
              <p className="text-sm text-slate-600">
                {(meta.horarios || []).join(' y ')} — {meta.timezone || 'America/Lima'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
            <EnvelopeIcon className="w-6 h-6 text-teal-600 shrink-0" />
            <div>
              <p className="font-medium text-slate-800">Correo off-site</p>
              <p className="text-sm text-slate-600 break-all">
                {(meta.destinatarios_correo || []).join(', ') || 'Configure BACKUP_EMAILS en el servidor'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-slate-500">Cargando respaldos…</p>
        ) : lista.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            Aún no hay respaldos registrados. El primero aparecerá tras la ejecución automática o
            manual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Fecha / hora</th>
                  <th className="text-left px-4 py-3 font-medium">Turno</th>
                  <th className="text-left px-4 py-3 font-medium">Excel</th>
                  <th className="text-left px-4 py-3 font-medium">SQL</th>
                  <th className="text-left px-4 py-3 font-medium">Correo</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatoFechaHoraDMY(row.created_at)}
                    </td>
                    <td className="px-4 py-3">{row.turno_etiqueta}</td>
                    <td className="px-4 py-3">{formatearBytes(row.excel_bytes)}</td>
                    <td className="px-4 py-3">
                      {row.tiene_sql ? formatearBytes(row.sql_bytes) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.email_enviado ? (
                        <span className="text-emerald-700">
                          Enviado{row.email_adjunto_sql ? ' (+ SQL)' : ''}
                        </span>
                      ) : (
                        <span className="text-amber-700">No enviado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeEstado(row.estado)}`}
                      >
                        {row.estado}
                      </span>
                      {row.mensaje_error && (
                        <p className="text-xs text-slate-500 mt-1 max-w-xs" title={row.mensaje_error}>
                          {row.mensaje_error.slice(0, 80)}
                          {row.mensaje_error.length > 80 ? '…' : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => descargarArchivo(row.id, 'excel', row.excel_nombre)}
                        disabled={descargandoId === `${row.id}-excel`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-teal-700 hover:bg-teal-50 rounded disabled:opacity-50"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Excel
                      </button>
                      {row.tiene_sql && (
                        <button
                          type="button"
                          onClick={() => descargarArchivo(row.id, 'sql', row.sql_nombre)}
                          disabled={descargandoId === `${row.id}-sql`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-slate-700 hover:bg-slate-100 rounded ml-1 disabled:opacity-50"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          SQL
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivoRespaldos;
