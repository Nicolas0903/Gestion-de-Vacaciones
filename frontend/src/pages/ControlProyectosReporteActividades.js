import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  TableCellsIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseFechaSegura } from '../utils/dateUtils';
import { controlProyectosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ControlProyectosReporteNav from '../components/ControlProyectosReporteNav';

const REQUERIDO_POR_OPTS = [
  { value: 'ricardo_martinez', label: 'Ricardo Martínez' },
  { value: 'rodrigo_loayza', label: 'Rodrigo Loayza' },
  { value: 'juan_pena', label: 'Juan Peña' },
  { value: 'magali_sevillano', label: 'Magali Sevillano' },
  { value: 'enrique_agapito', label: 'Enrique Agapito' }
];

const PRIOR = [
  { value: 'baja', label: 'Bajo' },
  { value: 'media', label: 'Medio' },
  { value: 'alta', label: 'Alta' }
];

const EST_ACT = [
  { value: 'no_iniciado', label: 'No iniciado' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'cerrado', label: 'Cerrado' }
];

const fmtNum = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';

function ymdDesdeLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangoPorDefectoFin() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 89);
  return { desde: ymdDesdeLocal(desde), hasta: ymdDesdeLocal(hasta) };
}

/** Fecha de fin como calendario local (filtro igual que el backend DATE(fecha_hora_fin)). */
function fmtFinLocal(fechaServidorStr) {
  if (!fechaServidorStr) return '—';
  try {
    const s = String(fechaServidorStr).trim().replace(/\.\d{3}$/, '');
    const conT = /\d{4}-\d{2}-\d{2} \d{2}:/.test(s) ? `${s.replace(' ', 'T')}` : s;
    const d = new Date(conT);
    if (Number.isNaN(d.getTime())) return fechaServidorStr;
    return format(d, 'dd/MM/yyyy hh:mm:ss a', { locale: es });
  } catch {
    return String(fechaServidorStr);
  }
}

/** Inicio: misma zona local que en operaciones. */
function fmtInicio(fechaServidorStr) {
  if (!fechaServidorStr) return '—';
  try {
    const d = parseFechaSegura(String(fechaServidorStr));
    return format(d, 'dd/MM/yyyy hh:mm:ss a', { locale: es });
  } catch {
    return String(fechaServidorStr).slice(0, 16);
  }
}

const ControlProyectosReporteActividades = () => {
  const { puedeGestionarProyectosCp } = useAuth();
  const gestor = puedeGestionarProyectosCp();
  const defs = useMemo(() => rangoPorDefectoFin(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finDesde, setFinDesde] = useState(defs.desde);
  const [finHasta, setFinHasta] = useState(defs.hasta);
  const [proyectoId, setProyectoId] = useState('');
  const [empresaSel, setEmpresaSel] = useState('Todas');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        fecha_fin_desde: finDesde,
        fecha_fin_hasta: finHasta
      };
      if (proyectoId) params.proyecto_id = proyectoId;
      if (empresaSel !== 'Todas' && empresaSel) params.empresa = empresaSel;

      const { data: res } = await controlProyectosService.reporteActividadesBi(params);
      if (res.success) setData(res.data);
      else toast.error(res.mensaje || 'Sin datos');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [finDesde, finHasta, proyectoId, empresaSel]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const empresasOpts = useMemo(() => {
    const rows = data?.proyectos_opciones || [];
    const u = [...new Set(rows.map((p) => String(p.empresa || '').trim()).filter(Boolean))];
    u.sort((a, b) => a.localeCompare(b));
    return u;
  }, [data]);

  const proyectosFiltEmpresa = useMemo(() => {
    const rows = data?.proyectos_opciones || [];
    if (empresaSel === 'Todas') return [...rows];
    return rows.filter((p) => String(p.empresa || '').trim() === empresaSel);
  }, [data, empresaSel]);

  const actividades = data?.actividades || [];
  const kpis = data?.kpis || {};

  const totalTablaHoras =
    Math.round(actividades.reduce((s, r) => s + (Number(r.horas_trabajadas) || 0), 0) * 100) / 100;

  const labelReq = (k) => REQUERIDO_POR_OPTS.find((x) => x.value === k)?.label || k;
  const labelPri = (k) => PRIOR.find((x) => x.value === k)?.label || k;
  const labelEst = (k) => EST_ACT.find((x) => x.value === k)?.label || k;

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

      <ControlProyectosReporteNav active="actividades" />

      <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 mb-8">
        <div className="bg-slate-800 text-white px-4 py-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div className="flex items-start gap-3">
              <TableCellsIcon className="w-8 h-8 text-teal-300 shrink-0" />
              <div>
                <h1 className="text-xl font-bold">Reporte</h1>
                <p className="text-xs text-slate-300 mt-1">
                  Actividades / registro de horas · el rango usa la <strong className="text-white">fecha y hora de fin</strong> de cada actividad
                  · compare con calendario (día en hora local del navegador).
                  {data?.alcance === 'todos'
                    ? ' Alcance administración.'
                    : ' Alcance solo actividades donde usted es el consultor asignado.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-end text-slate-800">
              <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[160px]">
                Proyecto
                <select
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="rounded-lg border-0 px-3 py-2 bg-white text-sm text-slate-900"
                >
                  <option value="">Todas</option>
                  {proyectosFiltEmpresa.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.empresa} — {p.proyecto}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[160px]">
                Empresa
                <select
                  value={empresaSel}
                  onChange={(e) => {
                    setEmpresaSel(e.target.value);
                    setProyectoId('');
                  }}
                  className="rounded-lg border-0 px-3 py-2 bg-white text-sm text-slate-900"
                >
                  <option value="Todas">Todas</option>
                  {empresasOpts.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="flex flex-wrap gap-3 border border-slate-600 rounded-lg px-3 py-2 pb-3 bg-slate-700/50">
                <legend className="text-xs px-2 text-slate-200">Fecha y hora de fin (rango inclusivo por día)</legend>
                <label className="flex flex-col text-[11px] text-slate-200 gap-1">
                  Desde
                  <input
                    type="date"
                    value={finDesde}
                    onChange={(e) => setFinDesde(e.target.value)}
                    className="rounded-lg px-2 py-1.5 bg-white text-slate-900 text-sm border-0"
                  />
                </label>
                <label className="flex flex-col text-[11px] text-slate-200 gap-1">
                  Hasta
                  <input
                    type="date"
                    value={finHasta}
                    onChange={(e) => setFinHasta(e.target.value)}
                    className="rounded-lg px-2 py-1.5 bg-white text-slate-900 text-sm border-0"
                  />
                </label>
              </fieldset>
              <button
                type="button"
                onClick={() => cargar()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 hover:bg-teal-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl bg-emerald-500 text-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-100 font-medium">Total de horas asignadas</p>
          <p className="text-3xl font-bold tabular-nums mt-2">{fmtNum(kpis.horas_asignadas_total)}</p>
          <p className="text-xs text-emerald-100 mt-1">Bolsa de proyectos en filtro · no limitada por el rango</p>
        </div>
        <div className="rounded-2xl bg-teal-800 text-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-teal-200 font-medium">Total de horas consumidas</p>
          <p className="text-3xl font-bold tabular-nums mt-2">{fmtNum(kpis.horas_consumidas_total)}</p>
          <p className="text-xs text-teal-200 mt-1">Suma de horas trabajadas (actividades dentro del filtro por fin)</p>
        </div>
        <div className="rounded-2xl bg-teal-500 text-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-teal-100 font-medium">Total de horas restantes</p>
          <p className="text-3xl font-bold tabular-nums mt-2">{fmtNum(kpis.horas_restantes_total)}</p>
          <p className="text-xs text-teal-100 mt-1">Asignadas − consumidas (mismo criterio de KPIs)</p>
        </div>
        <div className="rounded-2xl bg-sky-600 text-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-sky-100 font-medium">Horas promedio trabajadas por día</p>
          <p className="text-3xl font-bold tabular-nums mt-2">{fmtNum(kpis.horas_promedio_trabajadas_por_dia)}</p>
          <p className="text-xs text-sky-100 mt-1">
            Consumidas ÷ días distintos con fin en rango ({kpis.dias_con_actividad_en_rango ?? 0} días)
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Proyecto</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Requerido por</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Consultor asignado</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[200px]">Descripción de actividad</th>
                <th className="px-3 py-3 text-left font-semibold">Prioridad</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Fecha y hora de inicio</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Horas trabajadas</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Fecha y hora de fin</th>
                <th className="px-3 py-3 text-left font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : (
                actividades.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[180px] truncate" title={a.proyecto_nombre}>
                      {a.proyecto_nombre}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{labelReq(a.requerido_por)}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{a.consultor_nombre}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-md">{a.descripcion_actividad}</td>
                    <td className="px-3 py-2 text-slate-700">{labelPri(a.prioridad)}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono text-xs">{fmtInicio(a.fecha_hora_inicio)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                      {fmtNum(a.horas_trabajadas)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono text-xs">{fmtFinLocal(a.fecha_hora_fin)}</td>
                    <td className="px-3 py-2 text-slate-700">{labelEst(a.estado_actividad)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-teal-50 border-t-2 border-teal-200">
                <td colSpan={6} className="px-3 py-3 text-right font-bold text-teal-900">
                  Total
                </td>
                <td className="px-3 py-3 text-right font-bold tabular-nums text-teal-900">{fmtNum(totalTablaHoras)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        {!loading && actividades.length === 0 && (
          <p className="p-6 text-sm text-slate-500 text-center">No hay actividades con fecha de fin en el rango seleccionado.</p>
        )}
      </div>

      {!gestor && (
        <p className="text-xs text-slate-500">
          Como colaborador, solo ve actividades donde usted es el consultor asignado, dentro de proyectos en los que participa.
        </p>
      )}
    </div>
  );
};

export default ControlProyectosReporteActividades;
