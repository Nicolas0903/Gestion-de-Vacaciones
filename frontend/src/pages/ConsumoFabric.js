import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarSquareIcon,
  TrashIcon,
  PlusIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { consumoFabricService } from '../services/api';
import { formatoFechaHoraDMY } from '../utils/dateUtils';

const MESES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const fmtQty = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('es-PE', { maximumFractionDigits: 2 });
};

const BarraUso = ({ label, quantity, unit, pct, max }) => {
  const width = max ? Math.min(100, (quantity / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs gap-2">
        <span className="text-slate-700 truncate" title={label}>
          {label}
        </span>
        <span className="text-slate-500 shrink-0 tabular-nums">
          {fmtQty(quantity)} {unit}
          {pct != null ? ` · ${pct}%` : ''}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const VistaReporte = ({ reporte, onExportar, exportando }) => {
  if (!reporte) return null;
  const m = reporte.meta || {};
  const maxComp = Math.max(...(reporte.porComponente || []).map((x) => x.quantity), 1);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{m.customerName}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {m.customerDomain && <span>{m.customerDomain} · </span>}
              Periodo {m.periodoInicio || '—'} — {m.periodoFin || '—'}
              {m.mesLabel && (
                <span>
                  {' '}
                  · {m.mesLabel} {m.anio}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onExportar}
            disabled={exportando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Descargar Excel
          </button>
        </div>

        {reporte.montoMensual ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white border border-indigo-200 px-4 py-3 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Monto mensual (referencia)
            </span>
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {reporte.montoMensual.moneda} {fmtQty(reporte.montoMensual.monto)}
            </span>
            <span className="text-xs text-slate-500">
              {reporte.montoMensual.mesLabel} {reporte.montoMensual.anio}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Sin monto mensual cargado para este cliente y periodo. Regístrelo en la pestaña Montos
            mensuales.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-white/80 rounded-xl px-3 py-2 border border-slate-100">
            <span className="text-slate-500 text-xs">Registros PAYG</span>
            <p className="font-semibold text-slate-800">{m.totalFilas ?? reporte.resumen?.totalRegistros}</p>
          </div>
          <div className="bg-white/80 rounded-xl px-3 py-2 border border-slate-100">
            <span className="text-slate-500 text-xs">CU horas (aprox.)</span>
            <p className="font-semibold text-slate-800">{fmtQty(reporte.resumen?.totalCuHoras)}</p>
          </div>
          <div className="bg-white/80 rounded-xl px-3 py-2 border border-slate-100">
            <span className="text-slate-500 text-xs">Código Ingram</span>
            <p className="font-semibold text-slate-800">{m.codigoIngram || '—'}</p>
          </div>
        </div>
      </div>

      {reporte.insights?.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumen para el cliente</h3>
          <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
            {reporte.insights.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Consumo por componente</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(reporte.porComponente || []).map((it) => (
              <BarraUso
                key={it.key}
                label={it.key}
                quantity={it.quantity}
                unit={it.unit}
                pct={it.pct}
                max={maxComp}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Por producto / servicio</h3>
          <div className="space-y-2 text-sm">
            {(reporte.porProducto || []).map((it) => (
              <div key={it.key} className="flex justify-between gap-2 border-b border-slate-50 pb-2">
                <span className="text-slate-700">{it.key}</span>
                <span className="text-slate-500 tabular-nums shrink-0">
                  {fmtQty(it.quantity)} {it.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Por grupo de recursos</h3>
          <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {(reporte.porResourceGroup || []).map((it) => (
              <div key={it.key} className="flex justify-between">
                <span className="text-slate-600 font-mono text-xs">{it.key}</span>
                <span className="tabular-nums text-slate-800">
                  {fmtQty(it.quantity)} {it.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Actividad por día (top)</h3>
          <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
            {(reporte.porDia || []).slice(0, 15).map((it) => (
              <div key={it.key} className="flex justify-between">
                <span className="text-slate-600">{it.key}</span>
                <span className="tabular-nums">{fmtQty(it.quantity)} {it.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Detalle de medidores (top 15)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-4">Medidor</th>
                <th className="py-2 pr-4 text-right">Cantidad</th>
                <th className="py-2">Unidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(reporte.topMeters || []).map((it) => (
                <tr key={it.key}>
                  <td className="py-2 pr-4 text-slate-700">{it.key}</td>
                  <td className="py-2 pr-4 text-right tabular-nums font-medium">{fmtQty(it.quantity)}</td>
                  <td className="py-2 text-slate-500">{it.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Este reporte muestra únicamente consumo técnico (unidades de uso). No incluye precios ni
          facturación del archivo PAYG.
        </p>
      </div>
    </div>
  );
};

const ConsumoFabric = () => {
  const [tab, setTab] = useState('reportes');
  const [cargas, setCargas] = useState([]);
  const [montos, setMontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [reporteSel, setReporteSel] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [cargaId, setCargaId] = useState(null);

  const [formMonto, setFormMonto] = useState({
    customer_name: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    monto: '',
    moneda: 'US$'
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        consumoFabricService.listarCargas(),
        consumoFabricService.listarMontos()
      ]);
      setCargas(c.data.data || []);
      setMontos(m.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirReporte = async (id) => {
    try {
      const { data } = await consumoFabricService.obtenerCarga(id);
      setCargaId(id);
      setReporteSel(data.data.reporte_json);
      setTab('reportes');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo abrir el reporte.');
    }
  };

  const subirPayg = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const { data } = await consumoFabricService.subirPayg(file);
      toast.success(data.mensaje || 'Reporte generado.');
      setReporteSel(data.data.reporte_json);
      setCargaId(data.data.id);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al procesar PAYG.');
    } finally {
      setSubiendo(false);
    }
  };

  const exportar = async () => {
    if (!cargaId) return;
    setExportando(true);
    try {
      const res = await consumoFabricService.exportarCarga(cargaId);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consumo-fabric-${cargaId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo exportar.');
    } finally {
      setExportando(false);
    }
  };

  const guardarMonto = async (e) => {
    e.preventDefault();
    try {
      await consumoFabricService.guardarMonto({
        ...formMonto,
        monto: Number(formMonto.monto)
      });
      toast.success('Monto guardado.');
      setFormMonto({
        customer_name: '',
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        monto: '',
        moneda: 'US$'
      });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    }
  };

  const importarMontos = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { data } = await consumoFabricService.importarMontos(file);
      toast.success(data.mensaje);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al importar.');
    }
  };

  const eliminarMonto = async (id) => {
    if (!window.confirm('¿Eliminar este monto?')) return;
    try {
      await consumoFabricService.eliminarMonto(id);
      toast.success('Eliminado.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error.');
    }
  };

  const eliminarCarga = async (id) => {
    if (!window.confirm('¿Eliminar esta carga y su reporte?')) return;
    try {
      await consumoFabricService.eliminarCarga(id);
      if (cargaId === id) {
        setCargaId(null);
        setReporteSel(null);
      }
      toast.success('Eliminado.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-8"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
          <ChartBarSquareIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consumo Fabric</h1>
          <p className="text-sm text-slate-500">
            Reporte de uso Microsoft Fabric (PAYG) con monto mensual de referencia por cliente
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('reportes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'reportes'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500'
          }`}
        >
          Reportes de consumo
        </button>
        <button
          type="button"
          onClick={() => setTab('montos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'montos'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500'
          }`}
        >
          Montos mensuales
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : tab === 'montos' ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Registrar monto manual</h2>
            <form onSubmit={guardarMonto} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Cliente (CustomerName)</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formMonto.customer_name}
                  onChange={(e) => setFormMonto({ ...formMonto, customer_name: e.target.value })}
                  required
                  placeholder="METALPREN S.A."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mes</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formMonto.mes}
                  onChange={(e) => setFormMonto({ ...formMonto, mes: Number(e.target.value) })}
                >
                  {MESES.slice(1).map((nombre, i) => (
                    <option key={nombre} value={i + 1}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Año</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formMonto.anio}
                  onChange={(e) => setFormMonto({ ...formMonto, anio: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formMonto.monto}
                  onChange={(e) => setFormMonto({ ...formMonto, monto: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm cursor-pointer hover:bg-slate-50">
                <ArrowUpTrayIcon className="w-4 h-4 text-indigo-600" />
                Importar Excel (CustomerName, Mes, Año, Monto, Moneda)
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importarMontos} />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3">Año</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {montos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Sin montos registrados.
                    </td>
                  </tr>
                ) : (
                  montos.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.customer_name}</td>
                      <td className="px-4 py-3 text-center">{MESES[row.mes]}</td>
                      <td className="px-4 py-3 text-center">{row.anio}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {row.moneda} {fmtQty(row.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => eliminarMonto(row.id)}
                          className="text-rose-500 hover:text-rose-700"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <DocumentChartBarIcon className="w-10 h-10 text-indigo-500" />
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-slate-800">Subir Excel del proveedor (hoja PAYG)</p>
                <p className="text-xs text-slate-500 mt-1">
                  Un archivo por cliente. El monto del mes se toma de Montos mensuales si existe.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium cursor-pointer hover:bg-indigo-700 disabled:opacity-50">
                <ArrowUpTrayIcon className="w-5 h-5" />
                {subiendo ? 'Procesando…' : 'Subir PAYG'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={subiendo}
                  onChange={subirPayg}
                />
              </label>
            </div>
          </div>

          {reporteSel && (
            <VistaReporte reporte={reporteSel} onExportar={exportar} exportando={exportando} />
          )}

          <div className="rounded-2xl border border-slate-100">
            <h3 className="px-4 py-3 font-semibold text-slate-800 border-b border-slate-100">
              Historial de reportes
            </h3>
            {cargas.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Aún no hay cargas.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cargas.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <button
                      type="button"
                      onClick={() => abrirReporte(c.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <span className="font-medium text-slate-800">{c.customer_name}</span>
                      <span className="text-xs text-slate-500 block">
                        {MESES[c.mes]} {c.anio} · {c.total_filas} filas ·{' '}
                        {formatoFechaHoraDMY(c.created_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCarga(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumoFabric;
