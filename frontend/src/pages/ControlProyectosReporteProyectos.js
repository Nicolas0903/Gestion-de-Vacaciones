import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, PresentationChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { controlProyectosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESTADO_PROY = {
  finalizado: 'Finalizado',
  en_curso: 'En curso',
  pendiente: 'Pendiente',
  perdido: 'Perdido'
};

const PIE_META = [
  { key: 'en_curso', label: ESTADO_PROY.en_curso, color: '#7dd3fc' },
  { key: 'finalizado', label: ESTADO_PROY.finalizado, color: '#1e3a8a' },
  { key: 'pendiente', label: ESTADO_PROY.pendiente, color: '#86efac' },
  { key: 'perdido', label: ESTADO_PROY.perdido, color: '#94a3b8' }
];

const fmtNum = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 }) : '0';

function fmtFechaEs(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fechaMs(v) {
  if (!v) return NaN;
  const d = v instanceof Date ? v : new Date(v);
  return d.getTime();
}

function gradConicoPorEstados(cuentas, total) {
  if (!total) return 'conic-gradient(#e2e8f0 0deg 360deg)';
  let accDeg = 0;
  const segs = [];
  for (const { key, color } of PIE_META) {
    const n = cuentas[key] || 0;
    if (n <= 0) continue;
    const slice = (n / total) * 360;
    const end = accDeg + slice;
    segs.push(`${color} ${accDeg}deg ${end}deg`);
    accDeg = end;
  }
  if (!segs.length) return 'conic-gradient(#e2e8f0 0deg 360deg)';
  return `conic-gradient(${segs.join(', ')})`;
}

const NavReporteTabs = () => (
  <div className="flex flex-wrap gap-2 mb-6">
    <Link
      to="/control-proyectos/reporte"
      className="rounded-full px-4 py-1.5 text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    >
      Resumen
    </Link>
    <Link
      to="/control-proyectos/reporte/proyectos"
      className="rounded-full px-4 py-1.5 text-sm font-medium border border-transparent bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
    >
      Proyectos
    </Link>
  </div>
);

const ControlProyectosReporteProyectos = () => {
  const { puedeGestionarProyectosCp } = useAuth();
  const gestor = puedeGestionarProyectosCp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresaSel, setEmpresaSel] = useState('Todas');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await controlProyectosService.reporteProyectosVistaBi();
      if (res.success) {
        setData(res.data);
        setEmpresaSel('Todas');
      } else toast.error(res.mensaje || 'Sin datos');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const empresasOpts = useMemo(() => {
    const list = [...new Set((data?.proyectos || []).map((p) => String(p.empresa || '').trim()).filter(Boolean))];
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [data]);

  const filtered = useMemo(() => {
    const rows = data?.proyectos || [];
    if (empresaSel === 'Todas') return rows;
    return rows.filter((p) => String(p.empresa || '').trim() === empresaSel);
  }, [data, empresaSel]);

  const kpi = useMemo(() => {
    const cnt = { en_curso: 0, finalizado: 0, pendiente: 0, perdido: 0 };
    for (const p of filtered) {
      if (cnt[p.estado] !== undefined) cnt[p.estado] += 1;
    }
    return { total: filtered.length, ...cnt };
  }, [filtered]);

  const horasPorEmpresa = useMemo(() => {
    const m = new Map();
    for (const p of filtered) {
      const e = (p.empresa || 'Sin empresa').trim() || 'Sin empresa';
      m.set(e, (m.get(e) || 0) + (Number(p.horas_asignadas) || 0));
    }
    return [...m.entries()]
      .map(([empresa, horas]) => ({ empresa, horas }))
      .sort((a, b) => b.horas - a.horas);
  }, [filtered]);

  const maxHorasEmpresa = Math.max(...horasPorEmpresa.map((x) => x.horas), 1);

  const horasPromedioMostrar = useMemo(() => {
    if (!data) return 0;
    if (empresaSel === 'Todas') return Number(data.horas_promedio_actividad) || 0;
    let sumCons = 0;
    let sumAct = 0;
    for (const p of filtered) {
      sumCons += Number(p.horas_consumidas) || 0;
      sumAct += Number(p.num_actividades) || 0;
    }
    if (sumAct <= 0) return 0;
    return Math.round((sumCons / sumAct) * 100) / 100;
  }, [data, empresaSel, filtered]);

  const consultoresLista = useMemo(() => {
    if (!data) return [];
    if (empresaSel === 'Todas') return [...(data.consultores_catalogo || [])].sort((a, b) => a.localeCompare(b));
    const uniq = new Set();
    for (const p of filtered) {
      const s = p.consultores_nombres;
      if (!s) continue;
      String(s).split(',').forEach((part) => {
        const t = part.trim();
        if (t) uniq.add(t);
      });
    }
    return [...uniq].sort((a, b) => a.localeCompare(b));
  }, [data, empresaSel, filtered]);

  const rangoFechas = useMemo(() => {
    let minT = Infinity;
    let maxT = -Infinity;
    for (const p of filtered) {
      const a = fechaMs(p.fecha_inicio);
      const b = fechaMs(p.fecha_fin);
      if (Number.isFinite(a)) minT = Math.min(minT, a);
      if (Number.isFinite(b)) maxT = Math.max(maxT, b);
    }
    if (!Number.isFinite(minT)) return { ini: null, fin: null };
    return {
      ini: new Date(minT),
      fin: Number.isFinite(maxT) ? new Date(maxT) : null
    };
  }, [filtered]);

  const proyectosBarrasOrdenados = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const eb = Number(b.horas_consumidas) + Number(b.horas_asignadas);
      const ea = Number(a.horas_consumidas) + Number(a.horas_asignadas);
      return eb - ea;
    });
  }, [filtered]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
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

      <NavReporteTabs />

      <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <PresentationChartBarIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Horas bolsa vs consumidas, reparto por empresa y estado.
              {data?.alcance === 'todos' ? (
                <span className="text-indigo-700 font-medium"> Alcance: todos los proyectos.</span>
              ) : (
                <span className="text-indigo-700 font-medium"> Alcance: solo proyectos donde estás asignado.</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Empresa</span>
            <select
              value={empresaSel}
              onChange={(e) => setEmpresaSel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 min-w-[180px]"
            >
              <option value="Todas">Todas</option>
              {empresasOpts.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => cargar()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-slate-500">Cargando indicadores…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl bg-emerald-500 text-white shadow-sm p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">Total de proyectos</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{kpi.total}</p>
            </div>
            <div className="rounded-2xl bg-sky-500 text-white shadow-sm p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-100">En curso</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{kpi.en_curso}</p>
            </div>
            <div className="rounded-2xl bg-indigo-900 text-white shadow-sm p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">Finalizados</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{kpi.finalizado}</p>
            </div>
            <div className="rounded-2xl bg-emerald-600 text-white shadow-sm p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">Pendientes</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{kpi.pendiente}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="space-y-6">
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4">Horas asignadas por empresa</h2>
                <div className="space-y-3">
                  {horasPorEmpresa.map(({ empresa, horas }) => (
                    <div key={empresa}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1 gap-2">
                        <span className="truncate font-medium" title={empresa}>
                          {empresa}
                        </span>
                        <span className="tabular-nums shrink-0">{fmtNum(horas)} h</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-600"
                          style={{ width: `${(horas / maxHorasEmpresa) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {horasPorEmpresa.length === 0 && <p className="text-sm text-slate-500">Sin datos.</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-sky-500 text-white shadow-sm p-6 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-100">Horas promedio de trabajo</p>
                <p className="text-4xl font-bold tabular-nums mt-2">{fmtNum(horasPromedioMostrar)}</p>
                <p className="text-xs text-sky-100 mt-1">por registro de actividad (en el alcance filtrado)</p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-slate-800 mb-4">Estado del proyecto</h2>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div
                    className="w-36 h-36 rounded-full shrink-0 border-4 border-white shadow-inner"
                    style={{ background: gradConicoPorEstados(kpi, kpi.total) }}
                    title="Distribución por estado"
                  />
                  <ul className="flex-1 space-y-2 text-sm w-full">
                    {PIE_META.map(({ key, label, color }) => {
                      const n = kpi[key] || 0;
                      const pct = kpi.total ? Math.round((n / kpi.total) * 1000) / 10 : 0;
                      if (n <= 0) return null;
                      return (
                        <li key={key} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-slate-700 truncate">{label}</span>
                          </span>
                          <span className="tabular-nums text-slate-600 shrink-0">
                            {n} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {kpi.total === 0 && <p className="text-sm text-slate-500">Sin proyectos en este filtro.</p>}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col min-h-[320px]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-sm font-semibold text-slate-800">Horas consumidas vs horas restantes por proyecto</h2>
                <div className="flex gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-sky-400" /> Consumidas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-indigo-900" /> Restantes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-rose-500" /> Sobre bolsa
                  </span>
                </div>
              </div>
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {proyectosBarrasOrdenados.map((p) => {
                  const bolsa = Number(p.horas_asignadas) || 0;
                  const cons = Number(p.horas_consumidas) || 0;
                  const sobre = bolsa > 0 ? Math.max(0, cons - bolsa) : cons > 0 ? cons : 0;
                  const dentroCons = bolsa > 0 ? Math.min(cons, bolsa) : 0;
                  const rest = bolsa > 0 ? Math.max(bolsa - cons, 0) : 0;
                  const maxSeg = bolsa > 0 ? bolsa + sobre : Math.max(cons, 1);
                  const pctSobre = bolsa > 0 ? Math.round(((cons - bolsa) / bolsa) * 1000) / 10 : cons > 0 ? 100 : 0;

                  const wSobre = (sobre / maxSeg) * 100;
                  const wCons = bolsa > 0 ? ((dentroCons / maxSeg) * 100 || 0) : (cons / maxSeg) * 100 || 0;
                  const wRest = bolsa > 0 ? (rest / maxSeg) * 100 : 0;

                  return (
                    <div key={p.id} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(220px,2fr)_auto] gap-x-3 gap-y-1 items-center text-xs">
                      <span className="font-medium text-slate-700 truncate xl:max-w-none" title={p.proyecto}>
                        {p.proyecto}
                      </span>
                      <div className="flex h-3 rounded overflow-hidden bg-slate-100 min-w-[120px]">
                        {wSobre > 0 ? (
                          <div
                            className="h-full bg-rose-500"
                            style={{ width: `${wSobre}%` }}
                            title={`Sobre bolsa: ${fmtNum(sobre)} h`}
                          />
                        ) : null}
                        <div
                          className="h-full bg-sky-400"
                          style={{ width: `${wCons}%` }}
                          title={`Consumidas: ${fmtNum(cons)} h`}
                        />
                        <div
                          className="h-full bg-indigo-900"
                          style={{ width: `${wRest}%` }}
                          title={`Restantes: ${fmtNum(rest)} h`}
                        />
                      </div>
                      <span className="tabular-nums text-slate-600 text-right shrink-0">
                        {sobre > 0 ? (
                          <span className="text-rose-600 font-medium">{pctSobre}% sobre bolsa</span>
                        ) : bolsa > 0 ? (
                          <>
                            <span className="text-sky-700">{p.pct_consumido_bolsa}%</span>
                            {' · '}
                            <span className="text-indigo-950">{p.pct_restante_bolsa}% rest.</span>
                          </>
                        ) : (
                          <span>{fmtNum(cons)} h</span>
                        )}
                      </span>
                    </div>
                  );
                })}
                {proyectosBarrasOrdenados.length === 0 && (
                  <p className="text-sm text-slate-500 py-8 text-center">Sin proyectos en este filtro.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 rounded-2xl bg-sky-500 text-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-100">Fecha de inicio (mín.)</p>
                <p className="text-xl font-semibold tabular-nums mt-2">{fmtFechaEs(rangoFechas.ini)}</p>
              </div>
              <div className="flex-1 rounded-2xl bg-amber-600 text-white p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-100">Fecha de fin (máx.)</p>
                <p className="text-xl font-semibold tabular-nums mt-2">{fmtFechaEs(rangoFechas.fin)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Consultor asignado</h2>
              <ul className="text-sm text-slate-700 space-y-1.5 max-h-52 overflow-y-auto">
                {consultoresLista.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              {consultoresLista.length === 0 && <p className="text-sm text-slate-500">Nadie listado para este alcance.</p>}
            </div>
          </div>

          {!gestor && (
            <p className="text-xs text-slate-500 mt-6">
              Como colaborador, los datos solo incluyen proyectos en los que figuras como consultor asignado.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default ControlProyectosReporteProyectos;
