import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ChartBarSquareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { controlProyectosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADO_PROY = {
  finalizado: 'Finalizado',
  en_curso: 'En curso',
  pendiente: 'Pendiente',
  perdido: 'Perdido'
};

const fmtNum = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '0');

const ControlProyectosReporte = () => {
  const { puedeGestionarProyectosCp } = useAuth();
  const gestor = puedeGestionarProyectosCp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await controlProyectosService.reporteDashboard();
      if (res.success) setData(res.data);
      else toast.error(res.mensaje || 'Sin datos');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const maxHorasMes = useMemo(() => {
    const rows = data?.horas_por_mes || [];
    const m = Math.max(...rows.map((r) => Number(r.horas) || 0), 1);
    return m;
  }, [data]);

  const resumen = data?.resumen || {};

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Portal
        </Link>
        <span className="text-slate-300">·</span>
        <Link to="/control-proyectos" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Volver a operaciones
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          to="/control-proyectos/reporte"
          className="rounded-full px-4 py-1.5 text-sm font-medium border border-transparent bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
        >
          Resumen
        </Link>
        <Link
          to="/control-proyectos/reporte/proyectos"
          className="rounded-full px-4 py-1.5 text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          Proyectos
        </Link>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
            <ChartBarSquareIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reporte de control de proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Vista resumen tipo BI; no modifica registros.
              {data?.alcance === 'todos' ? (
                <span className="text-violet-700 font-medium"> Alcance: todos los proyectos.</span>
              ) : (
                <span className="text-violet-700 font-medium"> Alcance: solo proyectos donde estás asignado.</span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => cargar()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {loading && !data ? (
        <p className="text-slate-500">Cargando indicadores…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Proyectos</p>
              <p className="text-3xl font-bold text-slate-800 tabular-nums mt-1">{resumen.total_proyectos ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Horas bolsa (asignadas)</p>
              <p className="text-3xl font-bold text-indigo-600 tabular-nums mt-1">{fmtNum(resumen.horas_bolsa_total)}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Registros de actividades</p>
              <p className="text-3xl font-bold text-slate-800 tabular-nums mt-1">{resumen.registros_actividades ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Horas registradas</p>
              <p className="text-3xl font-bold text-emerald-600 tabular-nums mt-1">
                {fmtNum(resumen.horas_registradas_total)}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Proyectos por estado</h2>
              <div className="space-y-3">
                {(data?.proyectos_por_estado || []).map((row) => {
                  const label = ESTADO_PROY[row.estado] || row.estado;
                  const total = Number(data.proyectos_por_estado?.reduce((s, x) => s + Number(x.total), 0)) || 1;
                  const pct = Math.round((Number(row.total) / total) * 100);
                  return (
                    <div key={row.estado}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{label}</span>
                        <span className="tabular-nums font-medium">
                          {row.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!data?.proyectos_por_estado || data.proyectos_por_estado.length === 0) && (
                  <p className="text-sm text-slate-500">Sin proyectos en este alcance.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Horas registradas por mes</h2>
              <div className="flex items-end gap-2 h-52 border-b border-slate-200 pb-1 px-1">
                {(data?.horas_por_mes || []).map((row) => {
                  const h = Number(row.horas) || 0;
                  const barH = Math.min(200, Math.max(h > 0 ? 6 : 0, (h / maxHorasMes) * 200));
                  return (
                    <div key={row.mes} className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
                      <div
                        className="w-full max-w-[44px] mx-auto rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-400"
                        style={{ height: `${barH}px` }}
                        title={`${row.mes}: ${fmtNum(h)} h`}
                      />
                      <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center" title={row.mes}>
                        {row.mes.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">Últimos meses con actividad (hasta 14 meses hacia atrás).</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Top proyectos por horas registradas</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Empresa</th>
                    <th className="px-4 py-2 text-left">Proyecto</th>
                    <th className="px-4 py-2 text-left">Estado</th>
                    <th className="px-4 py-2 text-right">Horas reg.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.top_proyectos_horas || []).map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{r.empresa}</td>
                      <td className="px-4 py-2 font-medium">{r.proyecto}</td>
                      <td className="px-4 py-2">{ESTADO_PROY[r.estado] || r.estado}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtNum(r.horas_registradas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data?.top_proyectos_horas || data.top_proyectos_horas.length === 0) && (
                <p className="p-6 text-sm text-slate-500">Sin datos de horas en este alcance.</p>
              )}
            </div>
          </div>

          {!gestor && (
            <p className="text-xs text-slate-500 mt-6">
              Como colaborador, los totales solo incluyen proyectos en los que figuras como consultor asignado.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ControlProyectosReporte;
