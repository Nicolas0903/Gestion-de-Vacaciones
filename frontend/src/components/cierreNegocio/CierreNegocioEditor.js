import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { MONEDAS_RENDICION, formatoMontoRendicion, normalizarMonedaRendicion } from '../../utils/monedaRendicion';

const inp = 'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-teal-500';
const inpNum = `${inp} text-right tabular-nums`;
const inpDate = `${inp} min-w-[130px]`;

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function round2(n) {
  return Math.round(num(n) * 100) / 100;
}

function toDateInput(val) {
  if (!val) return '';
  return String(val).slice(0, 10);
}

function nuevaFacturacion(orden = 0) {
  return {
    factura: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_estimada_facturacion: '',
    fecha_real_facturacion: '',
    cantidad: 1,
    precio_unitario: 0,
    aplica_igv: true,
    total_venta: 0,
    orden
  };
}

function nuevoCosto(orden = 0) {
  return {
    fase: 'reporte',
    titulo: '',
    cantidad: 1,
    precio_unitario: 0,
    total_costo: 0,
    utilidad: 0,
    margen_pct: 0,
    proveedor: '',
    observacion: '',
    orden
  };
}

function mapFacturacion(rows = []) {
  return rows.map((r, i) => ({
    ...nuevaFacturacion(i),
    ...r,
    cantidad: num(r.cantidad, 1),
    precio_unitario: num(r.precio_unitario),
    aplica_igv: r.aplica_igv === 1 || r.aplica_igv === true,
    fecha_inicio: toDateInput(r.fecha_inicio),
    fecha_fin: toDateInput(r.fecha_fin),
    fecha_estimada_facturacion: toDateInput(r.fecha_estimada_facturacion),
    fecha_real_facturacion: toDateInput(r.fecha_real_facturacion),
    total_venta: round2(num(r.cantidad, 1) * num(r.precio_unitario))
  }));
}

function mapCostos(rows = []) {
  return rows
    .filter((r) => r.fase === 'reporte' || r.fase === 'inicial' || !r.fase)
    .map((r, i) => ({
      ...nuevoCosto(i),
      ...r,
      fase: 'reporte',
      cantidad: num(r.cantidad, 1),
      precio_unitario: num(r.precio_unitario),
      total_costo: num(r.total_costo) || round2(num(r.cantidad, 1) * num(r.precio_unitario)),
      utilidad: num(r.utilidad),
      margen_pct: num(r.margen_pct)
    }));
}

const cabeceraVacia = () => ({
  cliente_nombre: '',
  proyecto: '',
  ruc: '',
  orden_compra: '',
  cotizacion_codigo: '',
  codigo_servicio: '',
  direccion: '',
  atencion: '',
  tipo_cambio: '',
  fecha_inicio: '',
  fecha_fin: '',
  semanas_proyecto: '',
  forma_pago: '',
  moneda: 'PEN',
  riesgo: 'medio',
  status_cierre: 'inicial',
  dias_garantia: 0
});

function cabeceraFromDetalle(detalle) {
  if (!detalle?.cierre) return cabeceraVacia();
  const { cierre, snapshot } = detalle;
  return {
    cliente_nombre: cierre.cliente_nombre || '',
    proyecto:
      cierre.cotizacion_proyecto ||
      snapshot?.general?.nombre_proyecto ||
      '',
    ruc: cierre.ruc || '',
    orden_compra: cierre.orden_compra || '',
    cotizacion_codigo: cierre.cotizacion_codigo || '',
    codigo_servicio: cierre.codigo_servicio || '',
    direccion: cierre.direccion || '',
    atencion: cierre.atencion || '',
    tipo_cambio: cierre.tipo_cambio ?? '',
    fecha_inicio: toDateInput(cierre.fecha_inicio),
    fecha_fin: toDateInput(cierre.fecha_fin),
    semanas_proyecto: cierre.semanas_proyecto ?? '',
    forma_pago: cierre.forma_pago || '',
    moneda: normalizarMonedaRendicion(cierre.moneda),
    riesgo: cierre.riesgo || 'medio',
    status_cierre: cierre.status_cierre || 'inicial',
    dias_garantia: cierre.dias_garantia ?? 0
  };
}

function calcResumenPreview(facturacion, costos, igvPct = 0.18) {
  const linesF = facturacion.map((l) => ({
    ...l,
    total_venta: round2(num(l.cantidad, 1) * num(l.precio_unitario))
  }));
  const subtotal = round2(linesF.reduce((s, l) => s + l.total_venta, 0));
  const igv = round2(
    linesF.filter((l) => l.aplica_igv).reduce((s, l) => s + l.total_venta * igvPct, 0)
  );
  const totalFacturado = round2(subtotal + igv);
  const costosCalc = costos.map((c) => {
    const totalCosto = num(c.total_costo) || round2(num(c.cantidad, 1) * num(c.precio_unitario));
    return { ...c, total_costo: totalCosto };
  });
  const costoTotal = round2(costosCalc.reduce((s, c) => s + c.total_costo, 0));
  const utilidadTotal = round2(subtotal - costoTotal);
  const margenTotal = subtotal > 0 ? round2((utilidadTotal / subtotal) * 100) : 0;
  return { subtotal, igv, totalFacturado, costoTotal, utilidadTotal, margenTotal, linesF, costosCalc };
}

const CierreNegocioEditor = ({ detalle, onGuardar, guardando }) => {
  const [cab, setCab] = useState(cabeceraVacia);
  const [facturacion, setFacturacion] = useState([]);
  const [costos, setCostos] = useState([]);

  useEffect(() => {
    if (!detalle?.cierre) return;
    setCab(cabeceraFromDetalle(detalle));
    setFacturacion(mapFacturacion(detalle.facturacion));
    setCostos(mapCostos(detalle.costos));
  }, [detalle]);

  const moneda = cab.moneda;
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const preview = useMemo(() => calcResumenPreview(facturacion, costos), [facturacion, costos]);
  const sinCotizacion = !detalle?.cierre?.cotizacion_id;

  if (!detalle?.cierre) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center text-slate-500 text-sm">
        Cargando cierre…
      </div>
    );
  }

  const patchCab = (patch) => setCab((c) => ({ ...c, ...patch }));

  const patchFact = (idx, patch) => {
    setFacturacion((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        next.total_venta = round2(num(next.cantidad, 1) * num(next.precio_unitario));
        return next;
      })
    );
  };

  const patchCosto = (idx, patch) => {
    setCostos((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (patch.cantidad !== undefined || patch.precio_unitario !== undefined) {
          next.total_costo = round2(num(next.cantidad, 1) * num(next.precio_unitario));
        }
        return next;
      })
    );
  };

  const submit = () => {
    const payload = {
      ...cab,
      semanas_proyecto: cab.semanas_proyecto === '' ? null : num(cab.semanas_proyecto),
      dias_garantia: num(cab.dias_garantia),
      facturacion: facturacion.map((f, i) => ({
        item_num: i + 1,
        factura: f.factura || null,
        descripcion: f.descripcion || null,
        fecha_inicio: f.fecha_inicio || null,
        fecha_fin: f.fecha_fin || null,
        fecha_estimada_facturacion: f.fecha_estimada_facturacion || null,
        fecha_real_facturacion: f.fecha_real_facturacion || null,
        cantidad: num(f.cantidad, 1),
        precio_unitario: num(f.precio_unitario),
        aplica_igv: f.aplica_igv ? 1 : 0,
        total_venta: round2(num(f.cantidad, 1) * num(f.precio_unitario)),
        orden: i + 1
      })),
      costos: costos.map((c, i) => ({
        fase: 'reporte',
        titulo: c.titulo || null,
        cantidad: num(c.cantidad, 1),
        precio_unitario: num(c.precio_unitario),
        total_costo: num(c.total_costo) || round2(num(c.cantidad, 1) * num(c.precio_unitario)),
        utilidad: num(c.utilidad),
        margen_pct: num(c.margen_pct),
        proveedor: c.proveedor || null,
        observacion: c.observacion || null,
        orden: i + 1
      }))
    };
    if (sinCotizacion) {
      payload.proyecto = cab.proyecto;
    }
    onGuardar(payload);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500">Cliente *</label>
            <input className={inp} value={cab.cliente_nombre} onChange={(e) => patchCab({ cliente_nombre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Proyecto</label>
            <input className={inp} value={cab.proyecto} onChange={(e) => patchCab({ proyecto: e.target.value })} disabled={!sinCotizacion} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">RUC</label>
            <input className={inp} value={cab.ruc} onChange={(e) => patchCab({ ruc: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Orden de compra</label>
            <input className={inp} value={cab.orden_compra} onChange={(e) => patchCab({ orden_compra: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Cód. cotización (ref.)</label>
            <input className={inp} value={cab.cotizacion_codigo} onChange={(e) => patchCab({ cotizacion_codigo: e.target.value })} disabled={!sinCotizacion} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Cód. servicio / Tipo</label>
            <input className={inp} value={cab.codigo_servicio} onChange={(e) => patchCab({ codigo_servicio: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-500">Dirección</label>
            <input className={inp} value={cab.direccion} onChange={(e) => patchCab({ direccion: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Atención</label>
            <input className={inp} value={cab.atencion} onChange={(e) => patchCab({ atencion: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">T/C</label>
            <input type="number" step="0.0001" className={inpNum} value={cab.tipo_cambio} onChange={(e) => patchCab({ tipo_cambio: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha inicio</label>
            <input type="date" className={inpDate} value={cab.fecha_inicio} onChange={(e) => patchCab({ fecha_inicio: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha fin</label>
            <input type="date" className={inpDate} value={cab.fecha_fin} onChange={(e) => patchCab({ fecha_fin: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Semanas proyecto</label>
            <input type="number" step="0.1" className={inpNum} value={cab.semanas_proyecto} onChange={(e) => patchCab({ semanas_proyecto: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Moneda</label>
            <select className={inp} value={cab.moneda} onChange={(e) => patchCab({ moneda: e.target.value })}>
              {MONEDAS_RENDICION.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Forma de pago</label>
            <input className={inp} value={cab.forma_pago} onChange={(e) => patchCab({ forma_pago: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Riesgo</label>
            <select className={inp} value={cab.riesgo} onChange={(e) => patchCab({ riesgo: e.target.value })}>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Status cierre</label>
            <input className={inp} value={cab.status_cierre} onChange={(e) => patchCab({ status_cierre: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Días garantía</label>
            <input type="number" className={inpNum} value={cab.dias_garantia} onChange={(e) => patchCab({ dias_garantia: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-800">Facturación + costos (formato Excel)</h3>
            <p className="text-xs text-slate-500">Cada ítem de facturación debe tener su línea de costo en la misma posición</p>
          </div>
          <button
            type="button"
            onClick={() => setFacturacion((r) => [...r, nuevaFacturacion(r.length)])}
            className="inline-flex items-center gap-1 text-sm text-teal-700 hover:text-teal-900"
          >
            <PlusIcon className="w-4 h-4" /> Agregar línea
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal-700 text-white text-left">
              <tr>
                <th className="px-2 py-2">Factura</th>
                <th className="px-2 py-2 min-w-[140px]">Descripción</th>
                <th className="px-2 py-2">F. inicio</th>
                <th className="px-2 py-2">F. fin</th>
                <th className="px-2 py-2">F. est. fact.</th>
                <th className="px-2 py-2">F. real fact.</th>
                <th className="px-2 py-2 text-right">Cant.</th>
                <th className="px-2 py-2 text-right">P. unit.</th>
                <th className="px-2 py-2 text-center">IGV</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {facturacion.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1"><input className={inp} value={row.factura} onChange={(e) => patchFact(i, { factura: e.target.value })} placeholder="E001-…" /></td>
                  <td className="px-2 py-1"><input className={inp} value={row.descripcion} onChange={(e) => patchFact(i, { descripcion: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="date" className={inpDate} value={row.fecha_inicio} onChange={(e) => patchFact(i, { fecha_inicio: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="date" className={inpDate} value={row.fecha_fin} onChange={(e) => patchFact(i, { fecha_fin: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="date" className={inpDate} value={row.fecha_estimada_facturacion} onChange={(e) => patchFact(i, { fecha_estimada_facturacion: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="date" className={inpDate} value={row.fecha_real_facturacion} onChange={(e) => patchFact(i, { fecha_real_facturacion: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.cantidad} onChange={(e) => patchFact(i, { cantidad: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.precio_unitario} onChange={(e) => patchFact(i, { precio_unitario: e.target.value })} /></td>
                  <td className="px-2 py-1 text-center">
                    <input type="checkbox" checked={!!row.aplica_igv} onChange={(e) => patchFact(i, { aplica_igv: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums font-medium whitespace-nowrap">{fmt(row.total_venta)}</td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => setFacturacion((r) => r.filter((_, j) => j !== i))} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!facturacion.length && (
                <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-400">Sin líneas — agrega pagos o hitos de facturación</td></tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr><td colSpan={9} className="px-4 py-2 text-right font-medium">Sub Total</td><td className="px-2 py-2 text-right font-semibold">{fmt(preview.subtotal)}</td><td /></tr>
              <tr><td colSpan={9} className="px-4 py-1 text-right font-medium">IGV (18%)</td><td className="px-2 py-1 text-right font-semibold">{fmt(preview.igv)}</td><td /></tr>
              <tr className="bg-teal-50"><td colSpan={9} className="px-4 py-2 text-right font-bold text-teal-900">Total</td><td className="px-2 py-2 text-right font-bold text-teal-900">{fmt(preview.totalFacturado)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Cuadro de costos — utilidad (inicial)</h3>
          <button
            type="button"
            onClick={() => setCostos((r) => [...r, nuevoCosto(r.length)])}
            className="inline-flex items-center gap-1 text-sm text-teal-700 hover:text-teal-900"
          >
            <PlusIcon className="w-4 h-4" /> Agregar costo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-teal-700 text-white text-left">
              <tr>
                <th className="px-2 py-2 min-w-[120px]">Título / Recurso</th>
                <th className="px-2 py-2 text-right">Cant.</th>
                <th className="px-2 py-2 text-right">P. unit.</th>
                <th className="px-2 py-2 text-right">Total costo</th>
                <th className="px-2 py-2 text-right">Utilidad</th>
                <th className="px-2 py-2">Proveedor</th>
                <th className="px-2 py-2 min-w-[120px]">Observación</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {costos.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1"><input className={inp} value={row.titulo} onChange={(e) => patchCosto(i, { titulo: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.cantidad} onChange={(e) => patchCosto(i, { cantidad: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.precio_unitario} onChange={(e) => patchCosto(i, { precio_unitario: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.total_costo} onChange={(e) => patchCosto(i, { total_costo: e.target.value })} /></td>
                  <td className="px-2 py-1"><input type="number" step="0.01" className={inpNum} value={row.utilidad} onChange={(e) => patchCosto(i, { utilidad: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className={inp} value={row.proveedor} onChange={(e) => patchCosto(i, { proveedor: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className={inp} value={row.observacion} onChange={(e) => patchCosto(i, { observacion: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <button type="button" onClick={() => setCostos((r) => r.filter((_, j) => j !== i))} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!costos.length && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Sin líneas de costos</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-800 text-white text-sm flex flex-wrap gap-6">
          <span>Costo: <strong>{fmt(preview.costoTotal)}</strong></span>
          <span>Utilidad: <strong className="text-emerald-300">{fmt(preview.utilidadTotal)}</strong></span>
          <span>Margen: <strong>{preview.margenTotal.toFixed(2)}%</strong></span>
        </div>
      </section>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <button
          type="button"
          onClick={submit}
          disabled={guardando || !cab.cliente_nombre.trim()}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 shadow-lg"
        >
          {guardando ? 'Guardando…' : 'Guardar cierre'}
        </button>
      </div>
    </div>
  );
};

export default CierreNegocioEditor;
