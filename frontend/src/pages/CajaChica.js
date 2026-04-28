import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { cajaChicaService } from '../services/api';

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

const TIPOS = [
  { value: 'caja_chica', label: 'Caja chica' },
  { value: 'deposito_adicional', label: 'Depósito adicional del mes' },
  { value: 'saldo_anterior', label: 'Saldo a favor de la caja chica anterior' }
];

const fmt = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const filaVacia = () => ({ tipo_motivo: 'caja_chica', monto: '' });

const CajaChica = () => {
  const [periodos, setPeriodos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [ingresosEdit, setIngresosEdit] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const [nuevoAnio, setNuevoAnio] = useState(new Date().getFullYear());
  const [nuevoMes, setNuevoMes] = useState(new Date().getMonth() + 1);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const { data } = await cajaChicaService.listarPeriodos();
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
      const { data } = await cajaChicaService.detalle(id);
      setDetalle(data.data);
      const ing = data.data.ingresos || [];
      setIngresosEdit(
        ing.length
          ? ing.map((r) => ({ tipo_motivo: r.tipo_motivo, monto: String(r.monto) }))
          : [filaVacia()]
      );
    } catch {
      toast.error('No se pudo cargar el período.');
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
      setIngresosEdit([filaVacia()]);
    }
  }, [selId, cargarDetalle]);

  const crearPeriodo = async (e) => {
    e.preventDefault();
    try {
      const { data } = await cajaChicaService.crearPeriodo(nuevoAnio, nuevoMes);
      toast.success('Período creado.');
      await cargarLista();
      setSelId(data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo crear el período.');
    }
  };

  const guardarIngresos = async () => {
    if (!selId || detalle?.periodo?.estado !== 'borrador') return;
    const lineas = ingresosEdit
      .map((r) => ({
        tipo_motivo: r.tipo_motivo,
        monto: parseFloat(String(r.monto).replace(',', '.'), 10)
      }))
      .filter((r) => !Number.isNaN(r.monto));
    setGuardando(true);
    try {
      await cajaChicaService.guardarIngresos(selId, lineas);
      toast.success('Ingresos guardados.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarPeriodo = async () => {
    if (!selId || !detalle) return;
    if (
      !window.confirm(
        '¿Cerrar este período? El saldo quedará fijado y se usará como sugerencia de “saldo anterior” en el mes siguiente.'
      )
    ) {
      return;
    }
    try {
      await cajaChicaService.cerrar(selId);
      toast.success('Período cerrado.');
      await cargarLista();
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cerrar.');
    }
  };

  const reabrirPeriodo = async () => {
    if (!selId || detalle?.periodo?.estado !== 'cerrado') return;
    if (
      !window.confirm(
        '¿Reabrir este período en borrador? Solo ante correcciones excepcionales. Se anulará el saldo de cierre guardado hasta que vuelvas a cerrar.'
      )
    ) {
      return;
    }
    setReabriendo(true);
    try {
      await cajaChicaService.reabrir(selId);
      toast.success('Período reabierto. Ya puedes editar ingresos.');
      await cargarLista();
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo reabrir.');
    } finally {
      setReabriendo(false);
    }
  };

  const enviarResumenRocio = async () => {
    if (!selId) return;
    setEnviandoCorreo(true);
    try {
      const { data } = await cajaChicaService.enviarResumenRocio(selId);
      toast.success(data.mensaje || 'Correo enviado.');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo enviar el correo.');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const totalesVista = detalle?.totales;
  const esBorrador = detalle?.periodo?.estado === 'borrador';

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
          <WalletIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caja chica</h1>
          <p className="text-sm text-slate-500">
            Ingresos manuales por período y egresos desde reintegros aprobados (fecha de documento del mes).
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Nuevo período</h2>
            <form onSubmit={crearPeriodo} className="space-y-3">
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
                className="w-full rounded-xl bg-emerald-600 text-white text-sm font-medium py-2.5 hover:bg-emerald-700"
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
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
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
                      {p.saldo_cierre != null && (
                        <span className="block text-xs text-slate-500 mt-0.5">
                          Saldo cierre: {fmt(p.saldo_cierre)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selId && (
            <p className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              Selecciona o crea un período para ver ingresos, egresos y totales.
            </p>
          )}

          {selId && cargandoDetalle && <p className="text-sm text-slate-500">Cargando detalle…</p>}

          {selId && detalle && !cargandoDetalle && (
            <>
              {detalle.saldo_anterior_sugerido != null && (
                <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-900">
                  <strong>Saldo del mes anterior (cerrado):</strong> {fmt(detalle.saldo_anterior_sugerido)}. Puedes
                  usarlo como línea &quot;Saldo a favor de la caja chica anterior&quot; en ingresos.
                </div>
              )}

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Ingreso</h2>
                  {esBorrador && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIngresosEdit((rows) => [...rows, filaVacia()])}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        <PlusIcon className="w-4 h-4" /> Fila
                      </button>
                      <button
                        type="button"
                        disabled={guardando}
                        onClick={guardarIngresos}
                        className="rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                      >
                        Guardar ingresos
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600 border-b border-slate-100">
                        <th className="pb-2 pr-4 font-medium">Motivo / transferencia</th>
                        <th className="pb-2 font-medium w-36">Monto</th>
                        {esBorrador && <th className="pb-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {ingresosEdit.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-50">
                          <td className="py-2 pr-4">
                            {esBorrador ? (
                              <select
                                className="w-full max-w-md rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                value={row.tipo_motivo}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setIngresosEdit((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, tipo_motivo: v } : r))
                                  );
                                }}
                              >
                                {TIPOS.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>{TIPOS.find((t) => t.value === row.tipo_motivo)?.label}</span>
                            )}
                          </td>
                          <td className="py-2">
                            {esBorrador ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
                                value={row.monto}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setIngresosEdit((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, monto: v } : r))
                                  );
                                }}
                              />
                            ) : (
                              fmt(row.monto)
                            )}
                          </td>
                          {esBorrador && (
                            <td className="py-2">
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-rose-600"
                                onClick={() =>
                                  setIngresosEdit((rows) =>
                                    rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows
                                  )
                                }
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-slate-800 bg-amber-50/80">
                        <td className="py-2 pr-4">Total ingreso</td>
                        <td className="py-2 tabular-nums">{fmt(totalesVista?.total_ingreso)}</td>
                        {esBorrador && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">Egresos (reintegros aprobados)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fecha documento: {detalle.rango_fecha_documento?.desde} al {detalle.rango_fecha_documento?.hasta}
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  {detalle.egresos.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay egresos en este mes.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-600 border-b border-slate-100">
                          <th className="pb-2 pr-3 font-medium whitespace-nowrap">Fecha doc.</th>
                          <th className="pb-2 pr-3 font-medium">RUC / tipo</th>
                          <th className="pb-2 pr-3 font-medium">Nº documento</th>
                          <th className="pb-2 pr-3 font-medium">Descripción</th>
                          <th className="pb-2 font-medium text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.egresos.map((e) => (
                          <tr key={e.reembolso_id} className="border-b border-slate-50">
                            <td className="py-2 pr-3 whitespace-nowrap">{e.fecha_documento}</td>
                            <td className="py-2 pr-3">{e.ruc_proveedor}</td>
                            <td className="py-2 pr-3 font-mono text-xs">{e.numero_documento}</td>
                            <td className="py-2 pr-3 max-w-xs truncate" title={e.descripcion}>
                              {e.descripcion}
                            </td>
                            <td className="py-2 text-right tabular-nums">{fmt(e.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold bg-rose-900/90 text-white">
                          <td colSpan={4} className="py-2 px-3 rounded-l-lg">
                            Total egresos
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums rounded-r-lg">
                            {fmt(totalesVista?.total_egreso)}
                          </td>
                        </tr>
                        <tr className="font-bold text-emerald-900 bg-emerald-50">
                          <td colSpan={4} className="py-2 px-3">
                            Saldo (ingresos − egresos)
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">{fmt(totalesVista?.saldo)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={enviandoCorreo}
                  onClick={enviarResumenRocio}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white text-emerald-800 text-sm font-medium px-5 py-2.5 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {enviandoCorreo ? 'Enviando…' : 'Enviar resumen a Rocío'}
                </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CajaChica;
