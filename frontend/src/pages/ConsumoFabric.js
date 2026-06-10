import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  ChartBarSquareIcon,
  TrashIcon,
  PlusIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { consumoFabricService } from '../services/api';
import { formatoFechaHoraDMY } from '../utils/dateUtils';
import ConsumoFabricReporteVisual from '../components/ConsumoFabricReporteVisual';

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

const ConsumoFabric = () => {
  const [tab, setTab] = useState('reportes');
  const [cargas, setCargas] = useState([]);
  const [montos, setMontos] = useState([]);
  const [periodos, setPeriodos] = useState([]);
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
      const [c, m, p] = await Promise.all([
        consumoFabricService.listarCargas(),
        consumoFabricService.listarMontos(),
        consumoFabricService.listarPeriodosMontos()
      ]);
      setCargas(c.data.data || []);
      setMontos(m.data.data || []);
      setPeriodos(p.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (tab !== 'reportes' || !cargaId || loading) return;
    abrirReporte(cargaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  const descargarBlob = (blob, nombre, mime) => {
    const b = new Blob([blob], { type: mime });
    const url = window.URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportarExcel = async () => {
    if (!cargaId) return;
    setExportando(true);
    try {
      const res = await consumoFabricService.exportarCarga(cargaId);
      descargarBlob(
        res.data,
        `consumo-fabric-${cargaId}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo exportar Excel.');
    } finally {
      setExportando(false);
    }
  };

  const exportarPdf = async () => {
    if (!cargaId) return;
    setExportando(true);
    try {
      const res = await consumoFabricService.exportarCargaPdf(cargaId);
      descargarBlob(res.data, `consumo-fabric-${cargaId}.pdf`, 'application/pdf');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo exportar PDF.');
    } finally {
      setExportando(false);
    }
  };

  const refrescarReporteAbierto = async (mes, anio) => {
    if (!cargaId) return;
    const carga = cargas.find((c) => c.id === cargaId);
    if (!carga || carga.mes !== mes || carga.anio !== anio) return;
    await abrirReporte(cargaId);
  };

  const seleccionarPeriodo = (periodo) => {
    setFormMonto({
      customer_name: periodo.customer_name,
      mes: periodo.mes,
      anio: periodo.anio,
      monto: periodo.monto != null ? String(periodo.monto) : '',
      moneda: periodo.moneda || 'US$'
    });
  };

  const guardarMonto = async (e) => {
    e.preventDefault();
    const payload = {
      ...formMonto,
      monto: Number(formMonto.monto)
    };
    try {
      await consumoFabricService.guardarMonto(payload);
      toast.success('Monto guardado.');
      setFormMonto({
        customer_name: '',
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        monto: '',
        moneda: 'US$'
      });
      await cargar();
      await refrescarReporteAbierto(payload.mes, payload.anio);
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
            Reporte de uso y facturación Microsoft Fabric por cliente
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
          {periodos.length > 0 && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 overflow-hidden shadow-sm">
              <h2 className="px-5 py-3 font-semibold text-slate-800 border-b border-indigo-100 text-sm">
                Periodos con reporte de consumo
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/80 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Cliente</th>
                      <th className="px-4 py-2 font-medium">Periodo</th>
                      <th className="px-4 py-2 text-right font-medium">Monto</th>
                      <th className="px-4 py-2 w-28" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100/60 bg-white/50">
                    {periodos.map((p) => (
                      <tr key={`${p.customer_name}-${p.mes}-${p.anio}`}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{p.customer_name}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">
                          {MESES[p.mes]} {p.anio}
                          <span className="block text-[11px] text-slate-400">{p.total_filas} registros</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {p.monto != null ? (
                            <span className="font-semibold text-emerald-700">
                              {p.moneda} {fmtQty(p.monto)}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium">Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => seleccionarPeriodo(p)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {p.monto != null ? 'Editar' : 'Asignar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Registrar monto</h2>
            <form onSubmit={guardarMonto} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Cliente (CustomerName)</label>
                <input
                  list="consumo-fabric-clientes"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={formMonto.customer_name}
                  onChange={(e) => setFormMonto({ ...formMonto, customer_name: e.target.value })}
                  required
                  placeholder="METALPREN S.A."
                />
                <datalist id="consumo-fabric-clientes">
                  {periodos.map((p) => (
                    <option key={`${p.customer_name}-${p.mes}`} value={p.customer_name} />
                  ))}
                </datalist>
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
                  Un archivo por cliente. El importe del periodo se muestra al asignarlo en Montos mensuales.
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
            <ConsumoFabricReporteVisual
              reporte={reporteSel}
              onExportarExcel={exportarExcel}
              onExportarPdf={exportarPdf}
              exportando={exportando}
            />
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
