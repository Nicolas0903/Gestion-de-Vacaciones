import React from 'react';
import { formatoMontoRendicion, normalizarMonedaRendicion } from '../../utils/monedaRendicion';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtFecha(val) {
  if (!val) return '';
  const d = new Date(String(val).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${MESES[d.getMonth()]}/${d.getFullYear()}`;
}

function margenDisplay(m) {
  const v = Number(m);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(2)}%`;
}

const leyendaCls = {
  cancelado: 'bg-red-100 text-red-800 line-through',
  pendiente_pago: 'bg-amber-100 text-amber-900',
  pendiente_facturar: 'bg-slate-100 text-slate-600'
};

const CierreNegocioReporteExcel = ({ detalle }) => {
  if (!detalle) return null;

  const { cierre, reporte, snapshot } = detalle;
  const moneda = normalizarMonedaRendicion(cierre.moneda);
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const res = reporte?.resumen || {};
  const filas = reporte?.filas_emparejadas?.length
    ? reporte.filas_emparejadas
    : (reporte?.facturacion || []).map((f, i) => ({
        item: f.item_num ?? i + 1,
        facturacion: f,
        costo: (reporte?.costos || [])[i] || null
      }));

  const proyecto =
    cierre.cotizacion_proyecto || snapshot?.general?.nombre_proyecto || '—';
  const monedaLabel = moneda === 'USD' ? 'DÓLARES' : 'SOLES';

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden text-sm">
      {/* Encabezado estilo Excel */}
      <div className="border-b px-6 py-4 bg-slate-50">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente</p>
            <h2 className="text-lg font-bold text-slate-900">{cierre.cliente_nombre || '—'}</h2>
            <p className="text-slate-600 truncate">{proyecto}</p>
            {cierre.direccion && <p className="text-slate-500 text-xs">{cierre.direccion}</p>}
          </div>
          <div className="text-right shrink-0 space-y-1">
            <p className="text-xs font-semibold text-teal-800 uppercase">Cierre de Negocio N°</p>
            <p className="font-mono font-bold text-slate-800">{cierre.codigo}</p>
            <p className="text-xs text-slate-500">
              FECHA {fmtFecha(cierre.updated_at || cierre.created_at) || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-xs">
          <div><span className="text-slate-500">R.U.C.</span> <strong>{cierre.ruc || '—'}</strong></div>
          <div><span className="text-slate-500">Atención</span> {cierre.atencion || '—'}</div>
          <div><span className="text-slate-500">Tipo de Servicio</span> <strong>{cierre.codigo_servicio || '—'}</strong></div>
          <div><span className="text-slate-500">Cotización</span> {cierre.cotizacion_codigo || '—'}</div>
          <div><span className="text-slate-500">Nro. O/Compra</span> <strong>{cierre.orden_compra || '—'}</strong></div>
          <div><span className="text-slate-500">Forma de Pago</span> {cierre.forma_pago || '—'}</div>
          <div><span className="text-slate-500">Moneda</span> <strong>{monedaLabel}</strong></div>
          <div><span className="text-slate-500">T/C</span> {cierre.tipo_cambio ?? '—'}</div>
        </div>
      </div>

      {/* Títulos dual column */}
      <div className="grid grid-cols-2 border-b bg-teal-800 text-white text-xs font-semibold uppercase tracking-wide">
        <div className="px-4 py-2 border-r border-teal-700">Detalle de facturación al cliente</div>
        <div className="px-4 py-2">Cuadro de costos — utilidad</div>
      </div>

      {/* Tabla emparejada */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[1100px]">
          <thead>
            <tr className="bg-teal-700 text-white">
              <th className="px-2 py-2 border-r border-teal-600 w-10">Item</th>
              <th className="px-2 py-2 border-r border-teal-600">Factura</th>
              <th className="px-2 py-2 border-r border-teal-600 min-w-[160px]">Descripción</th>
              <th className="px-2 py-2 border-r border-teal-600">F. est. fact.</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">Cant.</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">P. Unit.</th>
              <th className="px-2 py-2 border-r-4 border-teal-900 text-right">Total Venta</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">P. Unit.</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">Total Costo</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">Utilidad</th>
              <th className="px-2 py-2 border-r border-teal-600 text-right">Margen</th>
              <th className="px-2 py-2 border-r border-teal-600">Proveedor</th>
              <th className="px-2 py-2">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((row, i) => {
              const f = row.facturacion || {};
              const c = row.costo || {};
              const estado = f.estado_linea;
              const rowCls = leyendaCls[estado] || '';
              return (
                <tr key={i} className={`hover:bg-slate-50/50 ${rowCls}`}>
                  <td className="px-2 py-2 text-center border-r border-slate-100">{row.item}</td>
                  <td className="px-2 py-2 border-r border-slate-100 font-mono">{f.factura || '—'}</td>
                  <td className="px-2 py-2 border-r border-slate-100">{f.descripcion || '—'}</td>
                  <td className="px-2 py-2 border-r border-slate-100 whitespace-nowrap">{fmtFecha(f.fecha_estimada_facturacion)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums">{Number(f.cantidad ?? 1).toFixed(2)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums">{fmt(f.precio_unitario)}</td>
                  <td className="px-2 py-2 border-r-4 border-slate-300 text-right tabular-nums font-medium">{fmt(f.total_venta)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums">{fmt(c.precio_unitario)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums">{fmt(c.total_costo)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums text-emerald-700">{fmt(c.utilidad)}</td>
                  <td className="px-2 py-2 border-r border-slate-100 text-right tabular-nums">{margenDisplay(c.margen_pct)}</td>
                  <td className="px-2 py-2 border-r border-slate-100">{c.proveedor || '—'}</td>
                  <td className="px-2 py-2 text-slate-500">{c.observacion || f.observaciones || '—'}</td>
                </tr>
              );
            })}
            {!filas.length && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-slate-400">
                  Sin líneas — completa en Editar datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales dual footer */}
      <div className="grid grid-cols-2 border-t">
        <div className="border-r p-4 space-y-1 bg-slate-50">
          <div className="flex justify-between"><span>Sub - Total</span><strong className="tabular-nums">{fmt(res.subtotal_facturacion)}</strong></div>
          <div className="flex justify-between"><span>I.G.V. (18%)</span><strong className="tabular-nums">{fmt(res.igv_facturacion)}</strong></div>
          <div className="flex justify-between text-teal-900 font-bold text-base pt-1 border-t"><span>TOTAL</span><span className="tabular-nums">{fmt(res.total_facturado)}</span></div>
        </div>
        <div className="p-4 space-y-1 bg-slate-50">
          <div className="flex justify-between"><span>COSTO</span><strong className="tabular-nums">{fmt(res.costo_total)}</strong></div>
          <div className="flex justify-between"><span>UTILIDAD</span><strong className="tabular-nums text-emerald-700">{fmt(res.utilidad)}</strong></div>
          <div className="flex justify-between font-bold pt-1 border-t"><span>Margen</span><span>{Number(res.margen_pct || 0).toFixed(2)}%</span></div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="px-4 py-3 border-t text-xs flex flex-wrap gap-4 bg-white">
        <span className="font-medium text-slate-600">Leyenda:</span>
        <span className={leyendaCls.cancelado + ' px-2 py-0.5 rounded'}>Cancelado</span>
        <span className={leyendaCls.pendiente_pago + ' px-2 py-0.5 rounded'}>Facturado y pendiente de pago</span>
        <span className={leyendaCls.pendiente_facturar + ' px-2 py-0.5 rounded'}>Pendiente de facturar</span>
      </div>
    </div>
  );
};

export default CierreNegocioReporteExcel;
