import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CurrencyDollarIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { comisionesPorPagarService } from '../services/api';
import { formatoFechaDMY } from '../utils/dateUtils';
import { formatoMontoRendicion, MONEDAS_RENDICION, normalizarMonedaRendicion } from '../utils/monedaRendicion';
import ModalPortal from '../components/ModalPortal';

const encabezadoVacio = () => ({
  vendedor: '',
  cliente: '',
  valor_servicio: '',
  moneda: 'PEN',
  porcentaje_comision: '10',
  condiciones_pago: '',
  estado: 'activo'
});

const pagoVacio = (orden = 1) => ({
  orden,
  forma: '',
  importe: '',
  no_factura: '',
  fecha_emision_factura: '',
  fecha_pago: '',
  firma: '',
  observaciones: ''
});

const etiquetaForma = (orden) => {
  const map = ['', '1er Pago', '2do Pago', '3er Pago', '4to Pago', '5to Pago', '6to Pago'];
  const n = Number(orden) || 1;
  return map[n] || `${n}° Pago`;
};

const ComisionesPorPagar = () => {
  const { esAdmin } = useAuth();
  const admin = esAdmin();

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [modalEncabezado, setModalEncabezado] = useState(null);
  const [formEnc, setFormEnc] = useState(encabezadoVacio());
  const [guardandoEnc, setGuardandoEnc] = useState(false);

  const [modalPago, setModalPago] = useState(null);
  const [formPago, setFormPago] = useState(pagoVacio());
  const [guardandoPago, setGuardandoPago] = useState(false);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await comisionesPorPagarService.listar();
      setLista(data.data || []);
    } catch {
      toast.error('No se pudo cargar la lista de comisiones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarDetalle = useCallback(async (id) => {
    if (!id) {
      setDetalle(null);
      return;
    }
    setLoadingDetalle(true);
    try {
      const { data } = await comisionesPorPagarService.obtener(id);
      setDetalle(data.data);
    } catch {
      toast.error('No se pudo cargar el detalle.');
      setSelId(null);
      setDetalle(null);
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    cargarDetalle(selId);
  }, [selId, cargarDetalle]);

  const comision = detalle?.comision;
  const pagos = detalle?.pagos || [];
  const monedaActiva = normalizarMonedaRendicion(comision?.moneda);
  const fmt = (n) => formatoMontoRendicion(n, monedaActiva);

  const totales = useMemo(() => {
    const sumaImportes = pagos.reduce((s, p) => s + Number(p.importe || 0), 0);
    const sumaComisiones = pagos.reduce((s, p) => s + Number(p.comision_monto || 0), 0);
    const valorServicio = Number(comision?.valor_servicio || 0);
    return { sumaImportes, sumaComisiones, valorServicio, pendiente: valorServicio - sumaImportes };
  }, [pagos, comision]);

  const abrirNuevaComision = () => {
    setFormEnc(encabezadoVacio());
    setModalEncabezado('nuevo');
  };

  const abrirEditarComision = () => {
    if (!comision) return;
    setFormEnc({
      vendedor: comision.vendedor || '',
      cliente: comision.cliente || '',
      valor_servicio: String(comision.valor_servicio ?? ''),
      moneda: normalizarMonedaRendicion(comision.moneda),
      porcentaje_comision: String(comision.porcentaje_comision ?? ''),
      condiciones_pago: comision.condiciones_pago || '',
      estado: comision.estado || 'activo'
    });
    setModalEncabezado('editar');
  };

  const guardarEncabezado = async () => {
    setGuardandoEnc(true);
    try {
      const body = {
        ...formEnc,
        valor_servicio: Number(formEnc.valor_servicio),
        moneda: normalizarMonedaRendicion(formEnc.moneda),
        porcentaje_comision: Number(formEnc.porcentaje_comision)
      };
      if (modalEncabezado === 'nuevo') {
        const { data } = await comisionesPorPagarService.crear(body);
        toast.success('Comisión registrada.');
        setModalEncabezado(null);
        await cargarLista();
        setSelId(data.data.comision.id);
      } else {
        await comisionesPorPagarService.actualizar(selId, body);
        toast.success('Encabezado actualizado.');
        setModalEncabezado(null);
        await cargarLista();
        await cargarDetalle(selId);
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar.');
    } finally {
      setGuardandoEnc(false);
    }
  };

  const eliminarComision = async () => {
    if (!selId || !window.confirm('¿Eliminar esta comisión y todas sus filas?')) return;
    try {
      await comisionesPorPagarService.eliminar(selId);
      toast.success('Comisión eliminada.');
      setSelId(null);
      setDetalle(null);
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const abrirNuevoPago = () => {
    const next = pagos.length ? Math.max(...pagos.map((p) => Number(p.orden) || 0)) + 1 : 1;
    setFormPago(pagoVacio(next));
    setModalPago('nuevo');
  };

  const abrirEditarPago = (p) => {
    setFormPago({
      orden: p.orden,
      forma: p.forma || '',
      importe: String(p.importe ?? ''),
      no_factura: p.no_factura || '',
      fecha_emision_factura: p.fecha_emision_factura?.slice?.(0, 10) || p.fecha_emision_factura || '',
      fecha_pago: p.fecha_pago?.slice?.(0, 10) || p.fecha_pago || '',
      firma: p.firma || '',
      observaciones: p.observaciones || ''
    });
    setModalPago(p.id);
  };

  const comisionPreview = useMemo(() => {
    const imp = Number(formPago.importe);
    const pct = Number(comision?.porcentaje_comision);
    if (!Number.isFinite(imp) || !Number.isFinite(pct)) return null;
    return Math.round(imp * (pct / 100) * 100) / 100;
  }, [formPago.importe, comision?.porcentaje_comision]);

  const guardarPago = async () => {
    if (!selId) return;
    setGuardandoPago(true);
    try {
      const body = {
        ...formPago,
        orden: Number(formPago.orden) || 1,
        forma: formPago.forma?.trim() || etiquetaForma(formPago.orden),
        importe: Number(formPago.importe)
      };
      if (modalPago === 'nuevo') {
        const { data } = await comisionesPorPagarService.crearPago(selId, body);
        setDetalle(data.data.detalle);
        toast.success('Fila agregada.');
      } else {
        const { data } = await comisionesPorPagarService.actualizarPago(selId, modalPago, body);
        setDetalle(data.data.detalle);
        toast.success('Fila actualizada.');
      }
      setModalPago(null);
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar la fila.');
    } finally {
      setGuardandoPago(false);
    }
  };

  const eliminarPago = async (pagoId) => {
    if (!selId || !window.confirm('¿Eliminar esta fila?')) return;
    try {
      const { data } = await comisionesPorPagarService.eliminarPago(selId, pagoId);
      setDetalle(data.data);
      toast.success('Fila eliminada.');
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="max-w-[min(120rem,calc(100vw-2rem))] mx-auto px-3 sm:px-4 py-6">
      <Link
        to="/portal"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CurrencyDollarIcon className="w-8 h-8 text-emerald-600" />
            Comisiones por Pagar
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            El administrador registra vendedor, cliente, valor del servicio, comisión y condiciones.
            Luego se agregan filas por cuota / factura con el formulario emergente.
          </p>
        </div>
        {admin && (
          <button
            type="button"
            onClick={abrirNuevaComision}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva comisión
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(260px,320px)_1fr] gap-6">
        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-medium text-slate-700">
            Registros ({lista.length})
          </div>
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {admin ? 'Cree la primera comisión con el botón superior.' : 'Aún no hay comisiones registradas.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelId(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors ${
                      selId === c.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-800 truncate">{c.cliente}</div>
                    <div className="text-xs text-slate-500 truncate">Vendedor: {c.vendedor}</div>
                    <div className="text-xs text-emerald-700 mt-1">
                      {formatoMontoRendicion(c.valor_servicio, c.moneda)} · {c.porcentaje_comision}%
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[420px]">
          {!selId ? (
            <div className="p-10 text-center text-slate-500">
              <TableCellsIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              Seleccione un registro de la lista para ver la tabla de pagos.
            </div>
          ) : loadingDetalle ? (
            <p className="p-8 text-slate-500">Cargando detalle…</p>
          ) : comision ? (
            <>
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/40">
                <div className="flex flex-wrap justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Comisiones por Pagar</h2>
                  <div className="flex flex-wrap gap-2">
                    {admin && (
                      <>
                        <button
                          type="button"
                          onClick={abrirEditarComision}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 hover:bg-white"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                          Editar encabezado
                        </button>
                        <button
                          type="button"
                          onClick={eliminarComision}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Eliminar
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={abrirNuevoPago}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Agregar fila
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-500">Vendedor:</span> <strong>{comision.vendedor}</strong></div>
                  <div><span className="text-slate-500">Cliente:</span> <strong>{comision.cliente}</strong></div>
                  <div><span className="text-slate-500">Valor del servicio:</span> <strong>{fmt(comision.valor_servicio)}</strong></div>
                  <div><span className="text-slate-500">Moneda:</span> <strong>{monedaActiva === 'USD' ? 'Dólares (USD)' : 'Soles (PEN)'}</strong></div>
                  <div><span className="text-slate-500">Comisión:</span> <strong>{comision.porcentaje_comision}%</strong></div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-500">Condiciones de pago:</span>{' '}
                    <span>{comision.condiciones_pago || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Forma</th>
                      <th className="px-3 py-2 text-right font-medium">Importe</th>
                      <th className="px-3 py-2 text-left font-medium">N° Factura</th>
                      <th className="px-3 py-2 text-left font-medium">F. emisión</th>
                      <th className="px-3 py-2 text-right font-medium">Comisión</th>
                      <th className="px-3 py-2 text-left font-medium">F. pago</th>
                      <th className="px-3 py-2 text-left font-medium">Firma</th>
                      <th className="px-3 py-2 text-left font-medium">Observaciones</th>
                      <th className="px-3 py-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          Sin filas. Use «Agregar fila» para registrar cuotas y facturas.
                        </td>
                      </tr>
                    ) : (
                      pagos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap">{p.forma}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{fmt(p.importe)}</td>
                          <td className="px-3 py-2">{p.no_factura || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatoFechaDMY(p.fecha_emision_factura)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-emerald-700">
                            {fmt(p.comision_monto)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatoFechaDMY(p.fecha_pago)}</td>
                          <td className="px-3 py-2">{p.firma || '—'}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate" title={p.observaciones || ''}>
                            {p.observaciones || '—'}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => abrirEditarPago(p)}
                              className="text-teal-700 hover:underline mr-2"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarPago(p.id)}
                              className="text-red-600 hover:underline"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {pagos.length > 0 && (
                    <tfoot className="bg-slate-50 font-medium">
                      <tr>
                        <td className="px-3 py-2">Totales</td>
                        <td className="px-3 py-2 text-right">{fmt(totales.sumaImportes)}</td>
                        <td colSpan={2} className="px-3 py-2 text-xs text-slate-500">
                          {totales.pendiente !== 0 && (
                            <span className={totales.pendiente < 0 ? 'text-red-600' : 'text-amber-700'}>
                              {totales.pendiente > 0 ? 'Pendiente por registrar: ' : 'Excede valor servicio: '}
                              {fmt(Math.abs(totales.pendiente))}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-800">{fmt(totales.sumaComisiones)}</td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <ModalPortal
        open={!!modalEncabezado}
        onClose={() => setModalEncabezado(null)}
        title={modalEncabezado === 'nuevo' ? 'Nueva comisión (encabezado)' : 'Editar encabezado'}
        subtitle="Solo administradores. Define vendedor, cliente, montos y condiciones."
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalEncabezado(null)} className="px-4 py-2 rounded-lg border border-slate-300">
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardandoEnc}
              onClick={guardarEncabezado}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {guardandoEnc ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Vendedor</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formEnc.vendedor}
              onChange={(e) => setFormEnc((f) => ({ ...f, vendedor: e.target.value }))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Cliente</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formEnc.cliente}
              onChange={(e) => setFormEnc((f) => ({ ...f, cliente: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Moneda</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
              value={formEnc.moneda}
              onChange={(e) => setFormEnc((f) => ({ ...f, moneda: e.target.value }))}
            >
              {MONEDAS_RENDICION.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Valor del servicio ({formEnc.moneda === 'USD' ? 'USD' : 'PEN'})
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formEnc.valor_servicio}
              onChange={(e) => setFormEnc((f) => ({ ...f, valor_servicio: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Comisión (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formEnc.porcentaje_comision}
              onChange={(e) => setFormEnc((f) => ({ ...f, porcentaje_comision: e.target.value }))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Condiciones de pago</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formEnc.condiciones_pago}
              onChange={(e) => setFormEnc((f) => ({ ...f, condiciones_pago: e.target.value }))}
            />
          </label>
        </div>
      </ModalPortal>

      <ModalPortal
        open={!!modalPago}
        onClose={() => setModalPago(null)}
        title={modalPago === 'nuevo' ? 'Agregar fila de pago' : 'Editar fila de pago'}
        subtitle={`Comisión ${comision?.porcentaje_comision ?? '—'}% · ${monedaActiva === 'USD' ? 'Dólares' : 'Soles'}.`}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalPago(null)} className="px-4 py-2 rounded-lg border border-slate-300">
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardandoPago}
              onClick={guardarPago}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {guardandoPago ? 'Guardando…' : 'Guardar fila'}
            </button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Orden / forma</span>
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.orden}
              onChange={(e) => {
                const orden = e.target.value;
                setFormPago((f) => ({
                  ...f,
                  orden,
                  forma: f.forma || etiquetaForma(orden)
                }));
              }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Etiqueta (ej. 1er Pago)</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.forma}
              placeholder={etiquetaForma(formPago.orden)}
              onChange={(e) => setFormPago((f) => ({ ...f, forma: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Importe ({monedaActiva === 'USD' ? 'USD' : 'PEN'})
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.importe}
              onChange={(e) => setFormPago((f) => ({ ...f, importe: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Comisión calculada</span>
            <div className="mt-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
              {comisionPreview != null ? formatoMontoRendicion(comisionPreview, monedaActiva) : '—'}
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">N° factura</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.no_factura}
              onChange={(e) => setFormPago((f) => ({ ...f, no_factura: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fecha emisión factura</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.fecha_emision_factura}
              onChange={(e) => setFormPago((f) => ({ ...f, fecha_emision_factura: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fecha pago</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.fecha_pago}
              onChange={(e) => setFormPago((f) => ({ ...f, fecha_pago: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Firma</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.firma}
              onChange={(e) => setFormPago((f) => ({ ...f, firma: e.target.value }))}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Observaciones</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formPago.observaciones}
              onChange={(e) => setFormPago((f) => ({ ...f, observaciones: e.target.value }))}
            />
          </label>
        </div>
      </ModalPortal>
    </div>
  );
};

export default ComisionesPorPagar;
