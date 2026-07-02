import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { proveedoresService } from '../services/api';
import { formatoFechaDMY } from '../utils/dateUtils';

const estadoLabel = {
  pendiente: 'Pendiente',
  en_evaluacion: 'En evaluación',
  completada: 'Completada',
  descartada: 'Descartada'
};

const estadoBadge = {
  pendiente: 'bg-amber-100 text-amber-800',
  en_evaluacion: 'bg-sky-100 text-sky-900',
  completada: 'bg-emerald-100 text-emerald-800',
  descartada: 'bg-slate-100 text-slate-600'
};

const SolicitudesProveedorTab = ({ onEvaluacionIniciada }) => {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [filtro, setFiltro] = useState('pendiente');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await proveedoresService.listarSolicitudesPendientes({ estado: filtro });
      setLista(data.data || []);
    } catch {
      toast.error('No se pudieron cargar las solicitudes.');
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const iniciarEvaluacion = async (solicitud) => {
    if (
      !window.confirm(
        `¿Iniciar evaluación para el RUC ${solicitud.ruc} (${solicitud.codigo})?`
      )
    ) {
      return;
    }
    setProcesandoId(solicitud.id);
    try {
      const { data } = await proveedoresService.iniciarEvaluacionDesdeSolicitud(solicitud.id);
      toast.success(data.mensaje || 'Evaluación iniciada.');
      if (onEvaluacionIniciada && data.data?.evaluacion) {
        onEvaluacionIniciada(data.data.evaluacion);
      }
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo iniciar la evaluación.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-5 h-5 text-teal-600" />
            Solicitudes desde Rendición de Presupuesto
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            RUC de comprobantes no registrados en la base de proveedores.
          </p>
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="pendiente">Pendientes</option>
          <option value="en_evaluacion">En evaluación</option>
          <option value="completada">Completadas</option>
          <option value="descartada">Descartadas</option>
        </select>
      </div>

      {cargando ? (
        <p className="p-8 text-sm text-slate-500 text-center">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="p-8 text-sm text-slate-500 text-center">
          No hay solicitudes con estado «{estadoLabel[filtro] || filtro}».
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2">Ticket</th>
                <th className="px-4 py-2">RUC</th>
                <th className="px-4 py-2">Solicitante</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{s.codigo}</td>
                  <td className="px-4 py-3 font-mono">{s.ruc}</td>
                  <td className="px-4 py-3">
                    {s.solicitante_nombres} {s.solicitante_apellidos}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" title={s.rendicion_concepto || s.detalle}>
                    {s.rendicion_concepto || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatoFechaDMY(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge[s.estado] || 'bg-slate-100'}`}
                    >
                      {estadoLabel[s.estado] || s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.estado === 'pendiente' && (
                      <button
                        type="button"
                        disabled={procesandoId === s.id}
                        onClick={() => iniciarEvaluacion(s)}
                        className="text-teal-700 hover:underline text-sm font-medium disabled:opacity-50"
                      >
                        {procesandoId === s.id ? 'Iniciando…' : 'Iniciar evaluación'}
                      </button>
                    )}
                    {s.estado === 'en_evaluacion' && s.evaluacion_id && (
                      <span className="text-xs text-slate-500">Eval. #{s.evaluacion_id}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SolicitudesProveedorTab;
