import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line
} from 'recharts';

const PALETTE = [
  '#4f46e5',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#6366f1',
  '#8b5cf6'
];

const fmtQty = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('es-PE', { maximumFractionDigits: 2 });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtQty(p.value)}
          {p.unit ? ` ${p.unit}` : ''}
        </p>
      ))}
    </div>
  );
};

const ConsumoFabricReporteVisual = ({ reporte, onExportarExcel, onExportarPdf, exportando }) => {
  if (!reporte) return null;
  const m = reporte.meta || {};

  const pieData = (reporte.porComponenteCu || []).slice(0, 8).map((x) => ({
    name: x.key,
    value: Math.round(x.quantity * 100) / 100,
    pct: x.pct
  }));

  const diaData = (reporte.porDia || []).map((x) => ({
    fecha: String(x.key).slice(5) || x.key,
    cu: Math.round(x.quantity * 100) / 100
  }));

  const historicoData = (reporte.historicoCombinado || []).map((h) => ({
    periodo: `${String(h.mesLabel || h.mes).slice(0, 3)} ${h.anio}`,
    monto: h.monto != null ? Number(h.monto) : null,
    cuHoras: Number(h.cuHoras) || 0
  }));

  const productoData = (reporte.porProducto || []).slice(0, 6).map((x) => ({
    name: x.key,
    valor: Math.round(x.quantity * 100) / 100
  }));

  return (
    <div id="reporte-consumo-fabric" className="space-y-6 print:bg-white">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              Reporte ejecutivo · Microsoft Fabric
            </p>
            <h2 className="text-2xl font-bold text-slate-900">{m.customerName}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {m.customerDomain && <span>{m.customerDomain} · </span>}
              {m.mesLabel} {m.anio} · {m.periodoInicio} — {m.periodoFin}
            </p>
            {reporte.vinculacion && (
              <p className="text-[11px] text-slate-400 mt-2 max-w-xl">
                Datos vinculados por <strong>cliente + mes ({reporte.vinculacion.mes}) + año ({reporte.vinculacion.anio})</strong>
                {reporte.vinculacion.montoEncontrado
                  ? ' · Monto mensual encontrado'
                  : ' · Sin monto mensual para este periodo'}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportarPdf}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={onExportarExcel}
              disabled={exportando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">CU horas</p>
            <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-1">
              {fmtQty(reporte.resumen?.totalCuHoras)}
            </p>
            <p className="text-xs text-slate-500">Consumo capacidad</p>
          </div>
          <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Monto mensual</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {reporte.montoMensual
                ? `${reporte.montoMensual.moneda} ${fmtQty(reporte.montoMensual.monto)}`
                : '—'}
            </p>
            <p className="text-xs text-slate-500">Referencia manual</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Componentes</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {(reporte.porComponenteCu || []).length}
            </p>
            <p className="text-xs text-slate-500">Con uso en CU</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Registros</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{m.totalFilas}</p>
            <p className="text-xs text-slate-500">Filas PAYG</p>
          </div>
        </div>
      </div>

      {reporte.insights?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Hallazgos clave</h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
            {reporte.insights.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-indigo-500 shrink-0">●</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {historicoData.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            Evolución: monto mensual vs consumo (CU horas)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Cruce histórico del mismo cliente por mes y año
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historicoData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="cu"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'CU h', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="monto"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{ value: 'US$', angle: 90, position: 'insideRight', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="cu" dataKey="cuHoras" name="CU horas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="monto"
                  type="monotone"
                  dataKey="monto"
                  name="Monto mensual"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Distribución por componente (CU)</h3>
          {pieData.length ? (
            <div className="h-64 flex">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtQty(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 text-xs space-y-1.5 overflow-y-auto max-h-64 py-2">
                {pieData.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate text-slate-700" title={d.name}>
                      {d.name}
                    </span>
                    <span className="text-slate-400 tabular-nums shrink-0">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin datos CU en este periodo.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Uso diario (CU horas)</h3>
          {diaData.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diaData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [fmtQty(v), 'CU']} />
                  <Bar dataKey="cu" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin fechas de uso.</p>
          )}
        </div>
      </div>

      {productoData.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Por producto / servicio</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productoData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={78} />
                <Tooltip formatter={(v) => fmtQty(v)} />
                <Bar dataKey="valor" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
        <h3 className="px-5 py-3 font-semibold text-slate-800 border-b border-slate-100 text-sm">
          Detalle de medidores (top 15)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Medidor</th>
                <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                <th className="px-4 py-2 text-left font-medium">Unidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(reporte.topMeters || []).map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-2 text-slate-700">{row.key}</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{fmtQty(row.quantity)}</td>
                  <td className="px-4 py-2 text-slate-500">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-50">
          Uso técnico sin precios del PAYG. El monto mensual es dato administrativo ingresado en el portal.
        </p>
      </div>
    </div>
  );
};

export default ConsumoFabricReporteVisual;
