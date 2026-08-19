import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatoDatetimeBolsaHoras } from '../utils/bolsaHorasDateUtils';
import { controlProyectosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ControlProyectosReporteNav from '../components/ControlProyectosReporteNav';

const REQUERIDO_POR_OPTS = [
  { value: 'ricardo_martinez', label: 'Ricardo Martínez' },
  { value: 'magali_sevillano', label: 'Magali Sevillano' },
  { value: 'enrique_agapito', label: 'Enrique Agapito' },
  { value: 'luis_aguayo', label: 'Luis Aguayo' },
  { value: 'stephanie_agapito', label: 'Stephanie Agapito' },
  { value: 'jeff_pena', label: 'Jeff Peña' },
  { value: 'otros', label: 'Otros' }
];

const EST_APROB = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'rechazada', label: 'Rechazada' }
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

const ControlProyectosReporteLocadores = () => {
  const { puedeGestionarProyectosCp } = useAuth();
  const gestor = puedeGestionarProyectosCp();
  const defs = useMemo(() => rangoPorDefectoFin(), []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finDesde, setFinDesde] = useState(defs.desde);
  const [finHasta, setFinHasta] = useState(defs.hasta);
  const [proyectoId, setProyectoId] = useState('');
  const [empresaSel, setEmpresaSel] = useState('Todas');
  const [consultorEmpId, setConsultorEmpId] = useState('');
  const [estadoAprobacion, setEstadoAprobacion] = useState('');
  const [consultoresOpts, setConsultoresOpts] = useState([]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        fecha_fin_desde: finDesde,
        fecha_fin_hasta: finHasta
      };
      if (proyectoId) params.proyecto_id = proyectoId;
      if (empresaSel !== 'Todas' && empresaSel) params.empresa = empresaSel;
      if (gestor && consultorEmpId) params.consultor_empleado_id = consultorEmpId;
      if (estadoAprobacion) params.estado_aprobacion = estadoAprobacion;

      const { data: res } = await controlProyectosService.reporteActividadesLocadoresBi(params);
      if (res.success) setData(res.data);
      else toast.error(res.mensaje || 'Sin datos');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [finDesde, finHasta, proyectoId, empresaSel, gestor, consultorEmpId, estadoAprobacion]);

  useEffect(() => {
    if (!gestor) return;
    controlProyectosService
      .consultoresSelect({})
      .then(({ data: r }) => setConsultoresOpts(r.data || []))
      .catch(() => setConsultoresOpts([]));
  }, [gestor]);

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

  const labelReq = (a) => {
    if (a?.requerido_por === 'otros') {
      const t = String(a.requerido_por_otros || '').trim();
      if (t) return t;
    }
    return REQUERIDO_POR_OPTS.find((x) => x.value === a?.requerido_por)?.label || a?.requerido_por;
  };

  const labelEstApr = (v) => EST_APROB.find((x) => x.value === v)?.label || v;

  return (
    <div className="w-full max-w-none">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Portal
        </Link>
        <Link to="/control-proyectos" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Bolsa de horas
        </Link>
      </div>

      <ControlProyectosReporteNav active="locadores" />

      <div className="rounded-2xl bg-slate-800 text-white p-6 mb-8 shadow-lg">
        <h1 className="text-xl font-bold mb-1">Flujo locadores — aprobación de horas</h1>
        <p className="text-sm text-slate-300">
          Solo actividades con flujo de aprobación (desde la fecha de corte). El histórico anterior no aparece aquí.
        </p>

        <div className="mt-6 flex flex-wrap gap-4 items-end">
          <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[140px]">
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
          <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[200px]">
            Proyecto
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="rounded-lg border-0 px-3 py-2 bg-white text-sm text-slate-900"
            >
              <option value="">Todos</option>
              {proyectosFiltEmpresa.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.proyecto}
                </option>
              ))}
            </select>
          </label>
          {gestor && (
            <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[200px]">
              Consultor
              <select
                value={consultorEmpId}
                onChange={(e) => setConsultorEmpId(e.target.value)}
                className="rounded-lg border-0 px-3 py-2 bg-white text-sm text-slate-900"
              >
                <option value="">Todos</option>
                {consultoresOpts.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre_completo || c.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col text-xs font-medium text-slate-300 gap-1">
            Fin desde
            <input
              type="date"
              value={finDesde}
              onChange={(e) => setFinDesde(e.target.value)}
              className="rounded-lg px-3 py-2 bg-white text-slate-900 text-sm border-0"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-300 gap-1">
            Fin hasta
            <input
              type="date"
              value={finHasta}
              onChange={(e) => setFinHasta(e.target.value)}
              className="rounded-lg px-3 py-2 bg-white text-slate-900 text-sm border-0"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-300 gap-1 min-w-[140px]">
            Aprobación
            <select
              value={estadoAprobacion}
              onChange={(e) => setEstadoAprobacion(e.target.value)}
              className="rounded-lg border-0 px-3 py-2 bg-white text-sm text-slate-900"
            >
              <option value="">Todas</option>
              {EST_APROB.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => cargar()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-violet-700 text-white">
                <th className="px-3 py-3 text-left font-semibold">ID</th>
                <th className="px-3 py-3 text-left font-semibold">Proyecto</th>
                <th className="px-3 py-3 text-left font-semibold">Consultor</th>
                <th className="px-3 py-3 text-left font-semibold">Requerido por</th>
                <th className="px-3 py-3 text-left font-semibold min-w-[220px]">Descripción de actividad</th>
                <th className="px-3 py-3 text-right font-semibold">Horas</th>
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Inicio</th>
                <th className="px-3 py-3 text-left font-semibold">Fin</th>
                <th className="px-3 py-3 text-left font-semibold">Aprobación</th>
                <th className="px-3 py-3 text-left font-semibold">Comentario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : (
                actividades.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">#{a.id}</td>
                    <td className="px-3 py-2">{a.proyecto_nombre}</td>
                    <td className="px-3 py-2">{a.consultor_nombre}</td>
                    <td className="px-3 py-2">{labelReq(a)}</td>
                    <td
                      className="px-3 py-2 text-slate-700 min-w-[220px] max-w-[360px] whitespace-normal align-top"
                      title={a.descripcion_actividad || ''}
                    >
                      {a.descripcion_actividad || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(a.horas_trabajadas)}</td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {formatoDatetimeBolsaHoras(a.fecha_hora_inicio)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {formatoDatetimeBolsaHoras(a.fecha_hora_fin)}
                    </td>
                    <td className="px-3 py-2">{labelEstApr(a.estado_aprobacion)}</td>
                    <td
                      className="px-3 py-2 text-slate-600 min-w-[160px] max-w-[280px] whitespace-normal align-top"
                      title={a.comentario_aprobacion || ''}
                    >
                      {a.comentario_aprobacion || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && actividades.length === 0 && (
          <p className="p-6 text-sm text-slate-500 text-center">
            No hay registros con flujo de aprobación en el rango seleccionado.
          </p>
        )}
      </div>
    </div>
  );
};

export default ControlProyectosReporteLocadores;
