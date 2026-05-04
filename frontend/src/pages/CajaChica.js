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
  EnvelopeIcon,
  PaperClipIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { cajaChicaService, reembolsoService } from '../services/api';
import { formatoFechaDMY } from '../utils/dateUtils';

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
  {
    value: 'saldo_anterior',
    label: 'Saldo de la caja chica (cierre del período anterior)'
  }
];

const fmt = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const filaVacia = () => ({
  id: undefined,
  tipo_motivo: 'caja_chica',
  monto: '',
  fecha_deposito: '',
  tiene_comprobante: false,
  archivoPendiente: null
});

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
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [adjuntoSubiendoIdx, setAdjuntoSubiendoIdx] = useState(null);

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
          ? ing.map((r) => ({
              id: r.id,
              tipo_motivo: r.tipo_motivo,
              monto: String(r.monto),
              fecha_deposito: r.fecha_deposito ? String(r.fecha_deposito).trim().slice(0, 10) : '',
              tiene_comprobante: !!(r.tiene_comprobante || r.comprobante_archivo),
              archivoPendiente: null
            }))
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
      .map((r) => {
        const rawMonto = String(r.monto ?? '').replace(',', '.').trim();
        let montoVal;
        if (rawMonto === '') {
          /* Fila ya guardada: mandar 0 en vez de omitirla (evita DELETE involuntario). */
          montoVal = r.id != null && r.id !== '' ? 0 : NaN;
        } else {
          montoVal = parseFloat(rawMonto, 10);
        }
        const linea = {
          tipo_motivo: r.tipo_motivo,
          monto: montoVal,
          fecha_deposito: r.fecha_deposito && String(r.fecha_deposito).trim() ? String(r.fecha_deposito).trim() : null
        };
        if (r.id != null && r.id !== '') linea.id = Number(r.id);
        return linea;
      })
      .filter((r) => !Number.isNaN(r.monto));
    setGuardando(true);
    try {
      const resp = await cajaChicaService.guardarIngresos(selId, lineas);
      const guardados = resp.data?.data || [];
      for (let i = 0; i < Math.min(guardados.length, ingresosEdit.length); i++) {
        const pend = ingresosEdit[i]?.archivoPendiente;
        if (pend && guardados[i]?.id) {
          try {
            setAdjuntoSubiendoIdx(i);
            await cajaChicaService.subirAdjuntoIngreso(selId, guardados[i].id, pend);
          } catch (uploadErr) {
            toast.error(uploadErr.response?.data?.mensaje || 'No se pudo subir un comprobante.');
          }
        }
      }
      toast.success('Ingresos guardados.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setAdjuntoSubiendoIdx(null);
      setGuardando(false);
    }
  };

  const descargarAdjuntoIngreso = async (ingresoId) => {
    if (!selId || !ingresoId) return;
    try {
      const res = await cajaChicaService.descargarAdjuntoIngreso(selId, ingresoId);
      const mime = res.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([res.data], { type: mime });
      const cd = res.headers['content-disposition'];
      let nombre = `comprobante-ingreso-${ingresoId}`;
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
      toast.error('No se pudo descargar el comprobante.');
    }
  };

  const subirAdjuntoFila = async (idx, ingresoId, files) => {
    const file = Array.isArray(files) ? files[0] : files?.[0];
    if (!file || !selId || !ingresoId) return;
    setAdjuntoSubiendoIdx(idx);
    try {
      await cajaChicaService.subirAdjuntoIngreso(selId, ingresoId, file);
      toast.success('Comprobante actualizado.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al subir el archivo.');
    } finally {
      setAdjuntoSubiendoIdx(null);
    }
  };

  const quitarAdjuntoFila = async (ingresoId) => {
    if (!selId || !ingresoId || !detalle?.periodo) return;
    if (detalle.periodo.estado !== 'borrador') return;
    if (!window.confirm('¿Quitar el comprobante adjunto de esta línea?')) return;
    try {
      await cajaChicaService.eliminarAdjuntoIngreso(selId, ingresoId);
      toast.success('Comprobante eliminado.');
      await cargarDetalle(selId);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const onArchivoSeleccionadoFila = (idx, ingresoId, e) => {
    const file = e.target?.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!ingresoId) {
      setIngresosEdit((rows) =>
        rows.map((r, i) => (i === idx ? { ...r, archivoPendiente: file, tiene_comprobante: true } : r))
      );
      toast('Archivo listo: se subirá al pulsar Guardar ingresos.', { icon: 'ℹ️' });
      return;
    }
    subirAdjuntoFila(idx, ingresoId, [file]);
  };

  const cerrarPeriodo = async () => {
    if (!selId || !detalle) return;
    if (
      !window.confirm(
        '¿Cerrar este período? El saldo calculado quedará guardado y, al crear el siguiente período, se cargará automáticamente en la línea de saldo del período anterior (positivo o negativo).'
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

  const descargarResumenPdf = async () => {
    if (!selId || !detalle) return;
    setDescargandoPdf(true);
    try {
      const res = await cajaChicaService.descargarResumenPdf(selId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nombre =
        detalle.periodo &&
        `Caja-chica-${detalle.periodo.anio}-${String(detalle.periodo.mes).padStart(2, '0')}-completo.pdf`;
      a.download = nombre || 'caja-chica-resumen.pdf';
      a.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      toast.success('PDF descargado.');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo descargar el PDF.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  const abrirComprobanteEgreso = async (e) => {
    try {
      const res = e.tiene_comprobante
        ? await reembolsoService.descargarComprobante(e.reembolso_id)
        : await reembolsoService.descargarRecibo(e.reembolso_id);
      const mime = res.headers['content-type'] || 'application/pdf';
      const blob = new Blob([res.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo abrir el comprobante o recibo.');
    }
  };

  const totalesVista = detalle?.totales;
  const esBorrador = detalle?.periodo?.estado === 'borrador';

  return (
    <div className="max-w-[min(96rem,calc(100vw-2rem))] mx-auto px-2 sm:px-4">
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

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
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

        <div className="lg:col-span-9 space-y-6">
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
                  <strong>Saldo del último período cerrado antes de este mes:</strong>{' '}
                  {fmt(detalle.saldo_anterior_sugerido)}. Al crear un período nuevo se rellena solo en la línea
                  correspondiente; aquí puedes comprobar o ajustar el monto si hace falta.
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
                <div className="px-5 pb-2">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Fecha de depósito opcional por línea. Comprobantes: PDF, imagen o Word (máx. 12&nbsp;MB). En filas nuevas,
                    guarda ingresos antes de adjuntar o elige archivo y se subirá al guardar.
                  </p>
                </div>
                <div className="px-2 sm:px-4 pb-4 overflow-x-auto">
                  <table className="table-fixed w-full text-sm border-separate border-spacing-0 min-w-[56rem]">
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '11rem' }} />
                      <col style={{ width: '7.5rem' }} />
                      <col />
                      {esBorrador ? <col style={{ width: '3rem' }} /> : null}
                    </colgroup>
                    <thead>
                      <tr className="text-left text-slate-600 border-b border-slate-200">
                        <th scope="col" className="pb-3 pr-3 pt-1 font-medium align-bottom">
                          Motivo / transferencia
                        </th>
                        <th scope="col" className="pb-3 pr-3 pt-1 font-medium align-bottom whitespace-nowrap">
                          Fecha depósito
                        </th>
                        <th scope="col" className="pb-3 pr-2 pt-1 font-medium text-right align-bottom whitespace-nowrap">
                          Monto
                        </th>
                        <th scope="col" className="pb-3 pr-2 pt-1 font-medium align-bottom">
                          Comprobante
                        </th>
                        {esBorrador ? (
                          <th scope="col" className="pb-3 pt-1 w-12 font-normal text-center align-bottom" aria-label="Eliminar fila">
                            <span className="sr-only">Eliminar</span>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {ingresosEdit.map((row, idx) => (
                        <tr key={row.id ?? `n-${idx}`} className="border-b border-slate-100">
                          <td className="py-2 pr-3 align-middle min-w-0">
                            {esBorrador ? (
                              <select
                                className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-left shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                style={{ paddingRight: '2.25rem' }}
                                value={row.tipo_motivo}
                                title={TIPOS.find((t) => t.value === row.tipo_motivo)?.label || ''}
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
                              <span className="block text-slate-800">
                                {TIPOS.find((t) => t.value === row.tipo_motivo)?.label}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 align-middle whitespace-nowrap">
                            {esBorrador ? (
                              <input
                                type="date"
                                className="w-full min-w-[9.5rem] rounded-lg border border-slate-200 px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                value={row.fecha_deposito || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setIngresosEdit((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, fecha_deposito: v } : r))
                                  );
                                }}
                              />
                            ) : (
                              <span className="text-slate-600">
                                {row.fecha_deposito ? formatoFechaDMY(row.fecha_deposito) : '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-2 align-middle">
                            {esBorrador ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm tabular-nums text-right shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder={
                                  row.tipo_motivo === 'saldo_anterior'
                                    ? 'Positivo o negativo según el cierre'
                                    : ''
                                }
                                value={row.monto}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setIngresosEdit((rows) =>
                                    rows.map((r, i) => (i === idx ? { ...r, monto: v } : r))
                                  );
                                }}
                              />
                            ) : (
                              <span className="block text-right tabular-nums">{fmt(row.monto)}</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 align-middle min-w-0">
                            <div className="flex flex-col gap-1.5 pl-1">
                              {row.archivoPendiente ? (
                                <span className="text-xs text-amber-700 line-clamp-2" title={row.archivoPendiente.name}>
                                  Pendiente: {row.archivoPendiente.name}
                                </span>
                              ) : null}
                              {adjuntoSubiendoIdx === idx ? (
                                <span className="text-xs text-slate-500">Subiendo…</span>
                              ) : esBorrador ? (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <input
                                    id={`adj-cchica-${idx}`}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,application/pdf,image/*"
                                    onChange={(e) => onArchivoSeleccionadoFila(idx, row.id, e)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => document.getElementById(`adj-cchica-${idx}`)?.click()}
                                    className="inline-flex items-center gap-1.5 shrink-0 rounded-md px-1 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:underline"
                                  >
                                    <PaperClipIcon className="w-4 h-4 shrink-0" />
                                    {row.tiene_comprobante && row.id ? 'Cambiar' : 'Adjuntar'}
                                  </button>
                                  {row.id && row.tiene_comprobante ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => descargarAdjuntoIngreso(row.id)}
                                        className="inline-flex items-center gap-1 shrink-0 text-xs text-slate-600 hover:underline"
                                      >
                                        <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" />
                                        Ver
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => quitarAdjuntoFila(row.id)}
                                        className="text-xs text-rose-600 hover:underline shrink-0"
                                      >
                                        Quitar
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              ) : row.tiene_comprobante ? (
                                <button
                                  type="button"
                                  onClick={() => descargarAdjuntoIngreso(row.id)}
                                  className="inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:underline"
                                >
                                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                                  Descargar
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          {esBorrador && (
                            <td className="py-2 align-middle text-center">
                              <button
                                type="button"
                                className="mx-auto inline-flex p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                                title="Eliminar fila"
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
                      <tr className="border-t border-amber-200 bg-amber-50/90">
                        <td colSpan={2} className="py-3 pr-3 pl-0 font-semibold text-slate-800">
                          Total ingreso
                        </td>
                        <td className="py-3 pr-2 font-semibold text-slate-800 tabular-nums text-right whitespace-nowrap">
                          {fmt(totalesVista?.total_ingreso)}
                        </td>
                        <td className="py-3" aria-hidden />
                        {esBorrador ? <td className="py-3" aria-hidden /> : null}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-800">Egresos (reintegros aprobados)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fecha documento: {formatoFechaDMY(detalle.rango_fecha_documento?.desde)} al{' '}
                    {formatoFechaDMY(detalle.rango_fecha_documento?.hasta)}.
                    Listado: <strong>facturas</strong> primero y luego <strong>recibos Prayaga</strong> (en cada grupo por
                    fecha).
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  {detalle.egresos.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay egresos en este mes.</p>
                  ) : (
                    <table className="min-w-[56rem] w-full text-sm table-fixed">
                      <thead>
                        <tr className="text-left text-slate-600 border-b border-slate-100">
                          <th className="pb-2 pr-3 font-medium whitespace-nowrap w-[7.5rem]">Fecha doc.</th>
                          <th className="pb-2 pr-3 font-medium w-[9.5rem]">RUC / tipo</th>
                          <th className="pb-2 pr-3 font-medium w-[11rem]">Nº documento</th>
                          <th className="pb-2 pr-3 font-medium">Descripción</th>
                          <th className="pb-2 pr-3 font-medium text-right w-[8.5rem] whitespace-nowrap">Monto</th>
                          <th className="pb-2 pl-2 font-medium text-center whitespace-nowrap w-[10.5rem]">
                            Comprobante / recibo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.egresos.map((e) => (
                          <tr key={e.reembolso_id} className="border-b border-slate-50">
                            <td className="py-2 pr-3 whitespace-nowrap">{formatoFechaDMY(e.fecha_documento)}</td>
                            <td className="py-2 pr-3">{e.ruc_proveedor}</td>
                            <td className="py-2 pr-3 font-mono text-xs">{e.numero_documento}</td>
                            <td className="py-2 pr-3 max-w-xs truncate" title={e.descripcion}>
                              {e.descripcion}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{fmt(e.monto)}</td>
                            <td className="py-2 pl-2 text-center align-middle whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => abrirComprobanteEgreso(e)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-xs font-medium"
                                title={
                                  e.tiene_comprobante
                                    ? 'Abrir comprobante adjunto'
                                    : 'Abrir recibo Prayaga (PDF)'
                                }
                              >
                                <PaperClipIcon className="w-4 h-4 shrink-0" />
                                {e.tiene_comprobante ? 'Factura' : 'Recibo'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold bg-rose-900/90 text-white">
                          <td colSpan={4} className="py-2 px-3 rounded-l-lg">
                            Total egresos
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                            {fmt(totalesVista?.total_egreso)}
                          </td>
                          <td className="py-2 px-3 rounded-r-lg" />
                        </tr>
                        <tr className="font-bold text-emerald-900 bg-emerald-50">
                          <td colSpan={4} className="py-2 px-3">
                            Saldo (ingresos − egresos)
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                            {fmt(totalesVista?.saldo)}
                          </td>
                          <td className="py-2 px-3" />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="text-xs text-slate-500 max-w-xl text-right">
                  Si cerraste un período y necesitas corregir algo, usa <strong>Reabrir período</strong>: vuelve a borrador,
                  podrás editar ingresos y cerrar de nuevo (el saldo de cierre anterior se anula hasta un nuevo cierre).
                </p>
                <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={descargandoPdf}
                  onClick={descargarResumenPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium px-5 py-2.5 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  {descargandoPdf ? 'Generando…' : 'Descargar PDF (mismo del correo)'}
                </button>
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CajaChica;
