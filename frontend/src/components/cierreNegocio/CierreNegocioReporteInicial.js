import React from 'react';
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ScaleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import {
  formatoMontoRendicion,
  etiquetaMonedaRendicion,
  normalizarMonedaRendicion
} from '../../utils/monedaRendicion';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function fmtFecha(val) {
  if (!val) return '—';
  const d = new Date(String(val).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function riesgoLabel(v) {
  if (v === 'bajo') return { text: 'Baja', cls: 'bg-emerald-100 text-emerald-800' };
  if (v === 'alto') return { text: 'Alta', cls: 'bg-red-100 text-red-800' };
  return { text: 'Media', cls: 'bg-amber-100 text-amber-800' };
}

function MetaItem({ label, value, highlight }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-0.5 text-sm ${highlight ? 'font-semibold text-red-600' : 'text-slate-800'}`}>
        {value || '—'}
      </dd>
    </div>
  );
}

const CierreNegocioReporteInicial = ({ detalle }) => {
  if (!detalle) return null;

  const { cierre, reporte, snapshot } = detalle;
  const moneda = normalizarMonedaRendicion(cierre.moneda);
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const res = reporte?.resumen || {};
  const cot = reporte?.cotizacion || {};
  const riesgo = riesgoLabel(cierre.riesgo);
  const proyecto =
    cierre.cotizacion_proyecto ||
    snapshot?.general?.nombre_proyecto ||
    snapshot?.general?.proyecto ||
    '—';
  const sinCotizacion = !cierre.cotizacion_id;
  const delta = res.delta_vs_cotizado ?? 0;
  const deltaPct = res.delta_pct_vs_cotizado ?? 0;
  const deltaPos = delta >= 0;
  const refCotizacion = cot.codigo || cierre.cotizacion_codigo;

  return (
    <div className="space-y-6">
      {/* Cabecera principal */}
      <div className="rounded-2xl overflow-hidden border border-teal-100 shadow-sm">
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4 min-w-0">
              <div className="hidden sm:flex w-14 h-14 rounded-xl bg-white/15 items-center justify-center shrink-0">
                <BuildingOffice2Icon className="w-8 h-8 text-white/90" />
              </div>
              <div className="min-w-0">
                <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">
                  Cierre de negocio · Inicial
                </p>
                <h2 className="text-xl md:text-2xl font-bold truncate">{cierre.cliente_nombre || '—'}</h2>
                <p className="text-teal-50 text-sm mt-1 truncate">{proyecto}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 text-sm font-mono">
                <DocumentTextIcon className="w-4 h-4" />
                {cierre.codigo}
              </div>
              {sinCotizacion ? (
                <p className="text-teal-100 text-xs mt-2">Cierre histórico · sin cotización vinculada</p>
              ) : (
                <p className="text-teal-100 text-xs mt-2">
                  Cotización {refCotizacion} · v{cot.version || cierre.cotizacion_version_num}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-5">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
            <MetaItem label="Fecha de inicio" value={fmtFecha(cierre.fecha_inicio)} />
            <MetaItem label="Fecha de fin" value={fmtFecha(cierre.fecha_fin)} />
            <MetaItem
              label="Tiempo del proyecto"
              value={cierre.semanas_proyecto != null ? `${cierre.semanas_proyecto} semanas` : '—'}
            />
            <MetaItem label="Orden de compra" value={cierre.orden_compra} />
            <MetaItem label="Código de cierre" value={cierre.codigo} />
            <MetaItem label="Forma de pago" value={cierre.forma_pago} />
            <MetaItem label="Riesgo" value={<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${riesgo.cls}`}>{riesgo.text}</span>} />
            <MetaItem label="Status del cierre" value={cierre.status_cierre || 'Inicial'} />
            <MetaItem label="Moneda" value={etiquetaMonedaRendicion(moneda)} />
            <MetaItem
              label="Cotización vinculada"
              value={sinCotizacion ? refCotizacion || 'Sin vínculo (histórico)' : refCotizacion}
            />
            <MetaItem label="Código de servicio" value={cierre.codigo_servicio} />
            <MetaItem
              label="Tiempo de garantía"
              value={cierre.dias_garantia ? `${cierre.dias_garantia} días` : '—'}
            />
          </dl>
        </div>
      </div>

      {/* Resumen financiero */}
      {sinCotizacion ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
            Cierre registrado manualmente. No hay baseline de cotización para comparar variaciones.
            {refCotizacion ? (
              <span className="block mt-1">
                Referencia externa: <strong>{refCotizacion}</strong>
              </span>
            ) : null}
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-2">
              <ScaleIcon className="w-4 h-4" />
              Total facturación inicial
            </div>
            <p className="text-2xl font-bold text-teal-700">{fmt(res.total_facturado)}</p>
            <p className="text-xs text-slate-400 mt-1">
              Subtotal {fmt(res.subtotal_facturacion)} + IGV {fmt(res.igv_facturacion)}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-2">
              <CurrencyDollarIcon className="w-4 h-4" />
              Monto cotizado (baseline)
            </div>
            <p className="text-2xl font-bold text-slate-800">{fmt(cot.monto_cotizado)}</p>
            <p className="text-xs text-slate-400 mt-1">Versión publicada congelada al crear el cierre</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide mb-2">
              <ScaleIcon className="w-4 h-4" />
              Total facturación inicial
            </div>
            <p className="text-2xl font-bold text-teal-700">{fmt(res.total_facturado)}</p>
            <p className="text-xs text-slate-400 mt-1">
              Subtotal {fmt(res.subtotal_facturacion)} + IGV {fmt(res.igv_facturacion)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 shadow-sm ${
              deltaPos ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-600 text-xs uppercase tracking-wide mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              Variación vs cotizado
            </div>
            <p className={`text-2xl font-bold ${deltaPos ? 'text-emerald-700' : 'text-amber-700'}`}>
              {deltaPos ? '+' : ''}
              {fmt(delta)}
            </p>
            <p className={`text-xs mt-1 ${deltaPos ? 'text-emerald-600' : 'text-amber-600'}`}>
              {deltaPos ? '+' : ''}
              {Number(deltaPct).toFixed(2)}% respecto al baseline
            </p>
          </div>
        </div>
      )}

      {/* Facturación al cliente */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Facturación al cliente</h3>
          <span className="text-xs text-slate-500">
            {sinCotizacion ? 'Carga manual de hitos de facturación' : 'Importado desde propuesta económica'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-700 text-white text-left">
                <th className="px-4 py-2.5 font-medium">Factura</th>
                <th className="px-4 py-2.5 font-medium">Descripción</th>
                <th className="px-4 py-2.5 font-medium">F. est. fact.</th>
                <th className="px-4 py-2.5 font-medium text-right">Cantidad</th>
                <th className="px-4 py-2.5 font-medium text-right">Precio unit.</th>
                <th className="px-4 py-2.5 font-medium text-center">IGV</th>
                <th className="px-4 py-2.5 font-medium text-right">Total venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(reporte?.facturacion || []).map((row, i) => (
                <tr key={row.id || i} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5 text-slate-500">{row.factura || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-800">{row.descripcion || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtFecha(row.fecha_estimada_facturacion)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Number(row.cantidad).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.precio_unitario)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {row.aplica_igv ? (
                      <span className="text-emerald-600 text-xs font-medium">Sí</span>
                    ) : (
                      <span className="text-slate-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmt(row.total_venta)}</td>
                </tr>
              ))}
              {!reporte?.facturacion?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Sin líneas de facturación
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-teal-200">
                <td colSpan={6} className="px-4 py-3 text-right font-medium text-slate-600">
                  Sub Total
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(res.subtotal_facturacion)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td colSpan={6} className="px-4 py-2 text-right font-medium text-slate-600">
                  IGV (18%)
                </td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(res.igv_facturacion)}</td>
              </tr>
              <tr className="bg-teal-50">
                <td colSpan={6} className="px-4 py-3 text-right font-bold text-teal-900">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-teal-900 tabular-nums text-lg">
                  {fmt(res.total_facturado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Cuadro de costos-utilidad inicial */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-800">Cuadro de costos — utilidad (inicial)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-700 text-white text-left">
                <th className="px-4 py-2.5 font-medium">Título / Recurso</th>
                <th className="px-4 py-2.5 font-medium text-right">Cantidad</th>
                <th className="px-4 py-2.5 font-medium text-right">Precio unit.</th>
                <th className="px-4 py-2.5 font-medium text-right">Total costo</th>
                <th className="px-4 py-2.5 font-medium text-right">Utilidad</th>
                <th className="px-4 py-2.5 font-medium text-right">Margen</th>
                <th className="px-4 py-2.5 font-medium">Proveedor</th>
                <th className="px-4 py-2.5 font-medium">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(reporte?.costos || []).map((row, i) => (
                <tr key={row.id || i} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{row.titulo || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Number(row.cantidad).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.precio_unitario)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(row.total_costo)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-medium">
                    {fmt(row.utilidad)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {Number(row.margen_pct).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{row.proveedor || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate" title={row.observacion || ''}>
                    {row.observacion || '—'}
                  </td>
                </tr>
              ))}
              {!reporte?.costos?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Sin líneas de costos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-slate-300">Resumen cierre inicial</span>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>
              <span className="text-slate-400">Costo:</span>{' '}
              <strong className="tabular-nums">{fmt(res.costo_total)}</strong>
            </span>
            <span>
              <span className="text-slate-400">Utilidad:</span>{' '}
              <strong className="tabular-nums text-emerald-300">{fmt(res.utilidad)}</strong>
            </span>
            <span>
              <span className="text-slate-400">Margen:</span>{' '}
              <strong className="tabular-nums">{Number(res.margen_pct).toFixed(2)}%</strong>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CierreNegocioReporteInicial;
