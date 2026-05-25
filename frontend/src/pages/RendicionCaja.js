import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  LockClosedIcon,
  LockOpenIcon,
  PaperClipIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { rendicionCajaService, rendicionPresupuestoService } from '../services/api';
import { formatoFechaDMY } from '../utils/dateUtils';
import { formatoMontoRendicion } from '../utils/monedaRendicion';

const MESES = [
  { v: 1, l: 'Enero' },
  { v: 2, l: 'Febrero' },
  { v: 3, l: 'Marzo' },
  { v: 4, l: 'Abril' },
  { v: 5, l: 'Mayo' },
  { v: 6, l: 'Junio' },
  { v: 7, l: 'Julio' },
  { v: 8, l: 'Agosto' },
  { v: 9, l: 'Septiembre' },
  { v: 10, l: 'Octubre' },
  { v: 11, l: 'Noviembre' },
  { v: 12, l: 'Diciembre' }
];

const fmt = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RendicionCaja = () => {
  const [periodos, setPeriodos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [filasEdit, setFilasEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [adjuntoSubiendoId, setAdjuntoSubiendoId] = useState(null);

  const [nuevoAnio, setNuevoAnio] = useState(new Date().getFullYear());
  const [nuevoMes, setNuevoMes] = useState(new Date().getMonth() + 1);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const { data } = await rendicionCajaService.listarPeriodos();
      setPeriodos(data.data || []);
    } catch {
      toast.error('No se pudieron cargar los períodos.');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  const cargarDetalle = useCallback(async (id) => {
    if (!id) return;
    setCargandoDetalle(true);
    try {
      const { data } = await rendicionCajaService.detalle(id);
      setDetalle(data.data);
      const rend = data.data.rendiciones || [];
      setFilasEdit(
        rend.map((r) => ({
          id: r.rendicion_id,
          fecha_deposito: r.fecha_deposito ? String(r.fecha_deposito).slice(0, 10) : '',
          monto_deposito: r.monto_deposito != null ? String(r.monto_deposito) : '',
          tiene_comprobante_deposito: r.tiene_comprobante_deposito,
          comprobante_deposito_nombre: r.comprobante_deposito_nombre,
          _meta: r
        }))
      );
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cargar el período.');
      setDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    if (selId) cargarDetalle(selId);
    else {
      setDetalle(null);
      setFilasEdit([]);
    }
  }, [selId, cargarDetalle]);

  const crearPeriodo = async (e) => {
    e.preventDefault();
    try {
      const { data } = await rendicionCajaService.crearPeriodo(nuevoAnio, nuevoMes);
      toast.success('Período creado.');
      await cargarLista();
      setSelId(data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo crear el período.');
    }
  };

  const guardarDepositos = async () => {
    if (!selId || detalle?.periodo?.estado !== 'borrador') return;
    const rendiciones = filasEdit.map((f) => ({
      id: f.id,
      fecha_deposito: f.fecha_deposito?.trim() || null,
      monto_deposito: f.monto_deposito === '' ? null : f.monto_deposito
    }));
    setGuardando(true);
    try {
      await rendicionCajaService.guardarDepositos(selId, rendiciones);
      toast.success('Datos de depósito guardados.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const subirComprobanteDeposito = async (rendicionId, file) => {
    if (!file || !selId) return;
    setAdjuntoSubiendoId(rendicionId);
    try {
      await rendicionCajaService.subirComprobanteDeposito(selId, rendicionId, file);
      toast.success('Comprobante de depósito actualizado.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al subir el archivo.');
    } finally {
      setAdjuntoSubiendoId(null);
    }
  };

  const descargarComprobanteDeposito = async (rendicionId) => {
    if (!selId) return;
    try {
      const res = await rendicionCajaService.descargarComprobanteDeposito(selId, rendicionId);
      const mime = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: mime });
      const cd = res.headers['content-disposition'];
      let nombre = `comprobante-deposito-${rendicionId}`;
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
    } catch {
      toast.error('No se pudo descargar el comprobante de depósito.');
    }
  };

  const quitarComprobanteDeposito = async (rendicionId) => {
    if (!selId || detalle?.periodo?.estado !== 'borrador') return;
    if (!window.confirm('¿Quitar el comprobante de depósito?')) return;
    try {
      await rendicionCajaService.eliminarComprobanteDeposito(selId, rendicionId);
      toast.success('Comprobante eliminado.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const abrirComprobanteSolicitud = async (rendicionId) => {
    try {
      const res = await rendicionPresupuestoService.descargarComprobante(rendicionId);
      const mime = res.headers['content-type'] || 'application/pdf';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo abrir el comprobante de la solicitud.');
    }
  };

  const cerrarPeriodo = async () => {
    if (!selId) return;
    if (!window.confirm('¿Cerrar este período? Ya no podrá editar depósitos hasta reabrirlo.')) return;
    try {
      await rendicionCajaService.cerrar(selId);
      toast.success('Período cerrado.');
      await cargarLista();
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cerrar.');
    }
  };

  const reabrirPeriodo = async () => {
    if (!selId || detalle?.periodo?.estado !== 'cerrado') return;
    if (!window.confirm('¿Reabrir el período en borrador para editar depósitos?')) return;
    setReabriendo(true);
    try {
      await rendicionCajaService.reabrir(selId);
      toast.success('Período reabierto.');
      await cargarLista();
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo reabrir.');
    } finally {
      setReabriendo(false);
    }
  };

  const esBorrador = detalle?.periodo?.estado === 'borrador';
  const totales = detalle?.totales;

  return (
    <div className="max-w-[min(96rem,calc(100vw-2rem))] mx-auto px-2 sm:px-4">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
          <BanknotesIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rendición Presupuesto</h1>
          <p className="text-sm text-slate-500">
            Rendiciones aprobadas del mes y registro de depósito: fecha, monto y comprobante de transferencia.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Nuevo período</h2>
            <form onSubmit={crearPeriodo} className="space-y-3">
              <p className="text-[11px] text-slate-500 leading-snug">
                Agrupa las rendiciones <strong>aprobadas</strong> cuya fecha de gasto cae en el mes seleccionado.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600">Año</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={nuevoAnio}
                    onChange={(e) => setNuevoAnio(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    min={2020}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Mes</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={nuevoMes}
                    onChange={(e) => setNuevoMes(parseInt(e.target.value, 10))}
                  >
                    {MESES.map((m) => (
                      <option key={m.v} value={m.v}>
                        {m.l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-violet-600 text-white text-sm font-medium py-2.5 hover:bg-violet-700"
              >
                Crear período
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">Períodos</h2>
              <button
                type="button"
                onClick={cargarLista}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                title="Actualizar"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>
            {cargandoLista ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : periodos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay períodos aún.</p>
            ) : (
              <ul className="space-y-1 max-h-80 overflow-y-auto">
                {periodos.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelId(p.id)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        selId === p.id
                          ? 'bg-violet-50 border border-violet-200 text-violet-900'
                          : 'border border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="font-medium">
                        {MESES.find((m) => m.v === p.mes)?.l} {p.anio}
                      </span>
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          p.estado === 'cerrado'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
                      </span>
                      {p.total_cierre != null && (
                        <span className="block text-xs text-slate-500 mt-0.5">
                          Total rendiciones: {fmt(p.total_cierre)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-9 space-y-6">
          {!selId && (
            <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              Selecciona o crea un período para ver las rendiciones aprobadas y registrar depósitos.
            </p>
          )}

          {selId && cargandoDetalle && <p className="text-sm text-slate-500">Cargando detalle…</p>}

          {selId && detalle && !cargandoDetalle && (
            <>
              {totales && (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm">
                    <span className="text-violet-700 block text-xs">Rendiciones</span>
                    <strong className="text-violet-900">{totales.total_rendiciones}</strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                    <span className="text-slate-600 block text-xs">Monto rendiciones</span>
                    <strong className="text-slate-900">{fmt(totales.total_monto_rendicion)}</strong>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm">
                    <span className="text-emerald-700 block text-xs">Con depósito completo</span>
                    <strong className="text-emerald-900">
                      {totales.rendiciones_con_deposito_registrado} / {totales.total_rendiciones}
                    </strong>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Rendiciones aprobadas</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fecha de gasto: {formatoFechaDMY(detalle.rango_fecha_documento?.desde)} al{' '}
                      {formatoFechaDMY(detalle.rango_fecha_documento?.hasta)}.
                    </p>
                  </div>
                  {esBorrador && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={guardarDepositos}
                      className="rounded-lg bg-violet-600 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      {guardando ? 'Guardando…' : 'Guardar depósitos'}
                    </button>
                  )}
                </div>
                <div className="px-5 pb-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Comprobante de depósito: PDF, imagen o Word (máx. 12&nbsp;MB). Es distinto del comprobante adjunto en
                    la solicitud original.
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  {filasEdit.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay rendiciones aprobadas en este mes.</p>
                  ) : (
                    <table className="min-w-[72rem] w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-600 border-b border-slate-100">
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Fecha gasto</th>
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Ticket</th>
                          <th className="pb-2 pr-2 font-medium">Área</th>
                          <th className="pb-2 pr-2 font-medium">Colaborador</th>
                          <th className="pb-2 pr-2 font-medium max-w-[10rem]">Concepto</th>
                          <th className="pb-2 pr-2 font-medium text-right whitespace-nowrap">Monto rend.</th>
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Solicitud</th>
                          <th className="pb-2 pr-2 font-medium whitespace-nowrap">Fecha depósito</th>
                          <th className="pb-2 pr-2 font-medium text-right whitespace-nowrap">Monto depósito</th>
                          <th className="pb-2 pl-2 font-medium">Comprob. depósito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasEdit.map((f, idx) => {
                          const m = f._meta;
                          return (
                            <tr key={f.id} className="border-b border-slate-50 align-top">
                              <td className="py-2 pr-2 whitespace-nowrap">
                                {formatoFechaDMY(m.fecha_documento)}
                              </td>
                              <td className="py-2 pr-2 font-mono text-xs whitespace-nowrap">{m.codigo_ticket}</td>
                              <td className="py-2 pr-2 text-xs">{m.area_label}</td>
                              <td className="py-2 pr-2">{m.empleado_nombre}</td>
                              <td className="py-2 pr-2 max-w-[10rem] truncate" title={m.concepto}>
                                {m.concepto}
                              </td>
                              <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">
                                {m.monto_rendicion_fmt || formatoMontoRendicion(m.monto_rendicion, m.moneda)}
                              </td>
                              <td className="py-2 pr-2">
                                {m.tiene_comprobante_solicitud ? (
                                  <button
                                    type="button"
                                    onClick={() => abrirComprobanteSolicitud(f.id)}
                                    className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                                  >
                                    <PaperClipIcon className="w-3.5 h-3.5" />
                                    Ver
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2 pr-2 whitespace-nowrap">
                                {esBorrador ? (
                                  <input
                                    type="date"
                                    className="w-full min-w-[9.5rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                    value={f.fecha_deposito || ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setFilasEdit((rows) =>
                                        rows.map((r, i) => (i === idx ? { ...r, fecha_deposito: v } : r))
                                      );
                                    }}
                                  />
                                ) : (
                                  <span>{f.fecha_deposito ? formatoFechaDMY(f.fecha_deposito) : '—'}</span>
                                )}
                              </td>
                              <td className="py-2 pr-2">
                                {esBorrador ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className="w-full min-w-[6rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-right tabular-nums"
                                    value={f.monto_deposito}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setFilasEdit((rows) =>
                                        rows.map((r, i) => (i === idx ? { ...r, monto_deposito: v } : r))
                                      );
                                    }}
                                  />
                                ) : (
                                  <span className="block text-right tabular-nums">
                                    {f.monto_deposito !== '' ? fmt(f.monto_deposito) : '—'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pl-2">
                                {adjuntoSubiendoId === f.id ? (
                                  <span className="text-xs text-slate-500">Subiendo…</span>
                                ) : esBorrador ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      id={`adj-rcaja-${f.id}`}
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,application/pdf,image/*"
                                      onChange={(e) => {
                                        const file = e.target?.files?.[0];
                                        if (e.target) e.target.value = '';
                                        if (file) subirComprobanteDeposito(f.id, file);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`adj-rcaja-${f.id}`)?.click()}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline"
                                    >
                                      <PaperClipIcon className="w-3.5 h-3.5" />
                                      {f.tiene_comprobante_deposito ? 'Cambiar' : 'Adjuntar'}
                                    </button>
                                    {f.tiene_comprobante_deposito && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => descargarComprobanteDeposito(f.id)}
                                          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline"
                                        >
                                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                          Ver
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => quitarComprobanteDeposito(f.id)}
                                          className="text-xs text-rose-600 hover:underline"
                                        >
                                          Quitar
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : f.tiene_comprobante_deposito ? (
                                  <button
                                    type="button"
                                    onClick={() => descargarComprobanteDeposito(f.id)}
                                    className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
                                  >
                                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                    Descargar
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold bg-violet-50 border-t border-violet-100">
                          <td colSpan={5} className="py-2 px-2 text-slate-800">
                            Totales
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmt(totales?.total_monto_rendicion)}</td>
                          <td />
                          <td />
                          <td className="py-2 px-2 text-right tabular-nums">
                            {fmt(totales?.total_monto_depositado)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="text-xs text-slate-500 max-w-xl text-right">
                  Cierre el período cuando haya registrado los depósitos. Puede reabrirlo para corregir datos.
                </p>
                <div className="flex flex-wrap justify-end gap-3">
                  {detalle.periodo.estado === 'cerrado' && (
                    <button
                      type="button"
                      disabled={reabriendo}
                      onClick={reabrirPeriodo}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm font-medium px-5 py-2.5 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <LockOpenIcon className="w-4 h-4" />
                      {reabriendo ? 'Reabriendo…' : 'Reabrir período'}
                    </button>
                  )}
                  {esBorrador && (
                    <button
                      type="button"
                      onClick={cerrarPeriodo}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-800 text-white text-sm font-medium px-5 py-2.5 hover:bg-slate-900"
                    >
                      <LockClosedIcon className="w-4 h-4" />
                      Cerrar período
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RendicionCaja;
