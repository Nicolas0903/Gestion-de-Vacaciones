import React, { useMemo } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatoMontoRendicion, normalizarMonedaRendicion } from '../../utils/monedaRendicion';

const TH = 'bg-emerald-800 text-white font-semibold text-sm px-3 py-2 border border-emerald-900';
const TD = 'border border-slate-300 px-2 py-1.5 text-sm';
const inp = 'w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-teal-400 rounded px-1';

const calcPropuestaLocal = (propuesta, igvPctDefault = 18) => {
  const igvPct = Number(propuesta?.igv_pct ?? igvPctDefault) / 100;
  const inversion_roles = (propuesta?.inversion_roles || []).map((item) => {
    const inversion = Number(item.inversion) || 0;
    const igv = Math.round(inversion * igvPct * 100) / 100;
    return { ...item, inversion, igv, total: Math.round((inversion + igv) * 100) / 100 };
  });
  const inversion_total = Math.round(inversion_roles.reduce((s, i) => s + i.inversion, 0) * 100) / 100;
  const igv_inversion = Math.round(inversion_roles.reduce((s, i) => s + i.igv, 0) * 100) / 100;
  const total_inversion = Math.round(inversion_roles.reduce((s, i) => s + i.total, 0) * 100) / 100;

  const pagos_entregables = (propuesta?.pagos_entregables || []).map((p) => {
    const porcentaje = Number(p.porcentaje) || 0;
    return { ...p, porcentaje, monto: Math.round(total_inversion * porcentaje * 100) / 100 };
  });

  const detalle = (propuesta?.detalle || []).map((d) => ({
    ...d,
    horas: Number(d.horas ?? d.semanas) || 0,
    precio: Number(d.precio) || 0
  }));
  const detalle_total = Math.round(detalle.reduce((s, d) => s + d.precio, 0) * 100) / 100;
  const detalle_igv = Math.round(detalle_total * igvPct * 100) / 100;
  const detalle_final = Math.round((detalle_total + detalle_igv) * 100) / 100;

  const pagos_forma = (propuesta?.pagos_forma || []).map((p) => {
    const porcentaje = Number(p.porcentaje) || 0;
    const base = detalle_final > 0 ? detalle_final : total_inversion;
    return { ...p, porcentaje, monto: Math.round(base * porcentaje * 100) / 100 };
  });

  return {
    inversion_roles,
    pagos_entregables,
    detalle,
    pagos_forma,
    totales: { inversion_total, igv_inversion, total_inversion, detalle_total, detalle_igv, detalle_final }
  };
};

const pctDisplay = (v) => Math.round((Number(v) || 0) * 10000) / 100;
const pctStore = (v) => Math.round(Number(v) * 100) / 10000;

const CotizacionesPropuesta = ({ propuesta, costos, actividades, onChange }) => {
  const moneda = normalizarMonedaRendicion(costos?.parametros?.moneda);
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const igvPct = propuesta?.igv_pct ?? costos?.parametros?.igv_pct ?? 18;

  const calc = useMemo(() => calcPropuestaLocal(propuesta, igvPct), [propuesta, igvPct]);
  const horasProyecto = useMemo(() => {
    if (actividades?.total_horas != null) return Number(actividades.total_horas);
    let total = 0;
    for (const b of actividades?.bloques || []) {
      for (const a of b.actividades || []) {
        total += Number(a.horas || 0) + Number(a.holgura_horas || 0);
      }
    }
    return total;
  }, [actividades]);

  const setProp = (patch) => onChange({ ...propuesta, ...patch });

  const updateList = (key, idx, patch) => {
    const list = [...(propuesta[key] || [])];
    list[idx] = { ...list[idx], ...patch };
    setProp({ [key]: list });
  };

  const addRow = (key, defaults) => {
    setProp({ [key]: [...(propuesta[key] || []), defaults] });
  };

  const removeRow = (key, idx) => {
    setProp({ [key]: (propuesta[key] || []).filter((_, i) => i !== idx) });
  };

  const syncInversionDesdeCostos = () => {
    const recursos = (costos?.recursos || []).filter((r) => !r.es_informativo);
    if (!recursos.length) return;
    const hm = Number(costos?.parametros?.horas_mes) || 160;
    const roles = recursos.map((r) => {
      const horas = Number(r.horas_asignadas ?? r.horas) || 0;
      const salario = Number(r.salario) || 0;
      const cantidad = Number(r.cantidad) || 1;
      const sobrecosto = Number(r.sobrecosto) || 1;
      const inversion = Math.round((salario / hm) * horas * cantidad * sobrecosto * 100) / 100;
      return { cantidad, actividad: r.rol || 'Recurso', inversion };
    });
    setProp({ inversion_roles: roles });
  };

  const syncDetalleHoras = () => {
    if (!horasProyecto) return;
    const det = [...(propuesta?.detalle || [])];
    if (det.length === 0) {
      det.push({ actividad: 'Construcción de la solución analítica', horas: horasProyecto, precio: 0 });
    } else {
      det[0] = { ...det[0], horas: horasProyecto };
    }
    setProp({ detalle: det });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Propuesta económica</h3>
          <p className="text-sm text-slate-500">
            Cuadros alineados al formato Excel · Moneda: {moneda === 'USD' ? 'Dólares ($)' : 'Soles (S/)'}
          </p>
        </div>
        <label className="text-sm flex items-center gap-2">
          IGV (%)
          <input
            type="number"
            step="0.01"
            value={igvPct}
            onChange={(e) => setProp({ igv_pct: Number(e.target.value) })}
            className="w-20 rounded border px-2 py-1"
          />
        </label>
      </div>

      {/* Cuadro 1: Inversión por roles */}
      <section>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h4 className="font-medium text-slate-700">Inversión por recursos / roles</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={syncInversionDesdeCostos}
              className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              Sincronizar desde costos
            </button>
            <button
              type="button"
              onClick={() => addRow('inversion_roles', { cantidad: 1, actividad: '', inversion: 0 })}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
            >
              <PlusIcon className="w-3 h-3" /> Fila
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className={`${TH} w-16`}>Cantidad</th>
                <th className={TH}>Actividades</th>
                <th className={`${TH} w-32`}>Inversión</th>
                <th className={`${TH} w-28`}>IGV</th>
                <th className={`${TH} w-32`}>Total Final</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody>
              {calc.inversion_roles.map((row, idx) => (
                <tr key={idx} className="bg-white">
                  <td className={TD}>
                    <input
                      type="number"
                      min="0"
                      value={row.cantidad ?? 1}
                      onChange={(e) => updateList('inversion_roles', idx, { cantidad: Number(e.target.value) })}
                      className={`${inp} text-center`}
                    />
                  </td>
                  <td className={TD}>
                    <input
                      value={row.actividad || ''}
                      onChange={(e) => updateList('inversion_roles', idx, { actividad: e.target.value })}
                      className={inp}
                    />
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.inversion ?? 0}
                      onChange={(e) => updateList('inversion_roles', idx, { inversion: Number(e.target.value) })}
                      className={`${inp} text-right`}
                    />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{fmt(row.igv)}</td>
                  <td className={`${TD} text-right font-medium tabular-nums`}>{fmt(row.total)}</td>
                  <td className={TD}>
                    <button type="button" onClick={() => removeRow('inversion_roles', idx)} className="text-red-500">
                      <TrashIcon className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {calc.inversion_roles.length > 0 && (
                <tr className="bg-emerald-50 font-semibold">
                  <td className={TD} colSpan={2} />
                  <td className={`${TD} text-right tabular-nums`}>{fmt(calc.totales.inversion_total)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmt(calc.totales.igv_inversion)}</td>
                  <td className={`${TD} text-right tabular-nums text-emerald-900`}>
                    {fmt(calc.totales.total_inversion)}
                  </td>
                  <td className={TD} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cuadro 2: Pagos vs entregables */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-slate-700">Pagos vs entregables</h4>
          <button
            type="button"
            onClick={() => addRow('pagos_entregables', { descripcion: '', porcentaje: 0.25 })}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
          >
            <PlusIcon className="w-3 h-3" /> Fila
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className={TH}>Pagos vs Entregables</th>
                <th className={`${TH} w-24`}>Porcentaje</th>
                <th className={`${TH} w-36`}>Forma de Pago</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody>
              {calc.pagos_entregables.map((row, idx) => (
                <tr key={idx} className="bg-white">
                  <td className={TD}>
                    <input
                      value={row.descripcion || ''}
                      onChange={(e) => updateList('pagos_entregables', idx, { descripcion: e.target.value })}
                      className={inp}
                    />
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        step="0.01"
                        value={pctDisplay(row.porcentaje)}
                        onChange={(e) =>
                          updateList('pagos_entregables', idx, { porcentaje: pctStore(e.target.value) })
                        }
                        className={`${inp} text-right w-14`}
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>
                  <td className={`${TD} text-right tabular-nums font-medium`}>{fmt(row.monto)}</td>
                  <td className={TD}>
                    <button type="button" onClick={() => removeRow('pagos_entregables', idx)} className="text-red-500">
                      <TrashIcon className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cuadro 3: Detalle propuesta */}
      <section>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h4 className="font-medium text-slate-700">Detalle de propuesta</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={syncDetalleHoras}
              className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50"
              title={`Horas totales del proyecto: ${horasProyecto}`}
            >
              Usar horas del proyecto ({horasProyecto.toFixed(1)} h)
            </button>
            <button
              type="button"
              onClick={() => addRow('detalle', { actividad: '', horas: 0, precio: 0 })}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
            >
              <PlusIcon className="w-3 h-3" /> Fila
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className={TH}>Detalle de propuesta</th>
                <th className={`${TH} w-28`}>Tiempo (Horas)</th>
                <th className={`${TH} w-36`}>Precio Total</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody>
              {calc.detalle.map((row, idx) => (
                <tr key={idx} className="bg-white">
                  <td className={TD}>
                    <input
                      value={row.actividad || ''}
                      onChange={(e) => updateList('detalle', idx, { actividad: e.target.value })}
                      className={inp}
                    />
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={row.horas ?? 0}
                      onChange={(e) => updateList('detalle', idx, { horas: Number(e.target.value) })}
                      className={`${inp} text-right`}
                    />
                  </td>
                  <td className={TD}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.precio ?? 0}
                      onChange={(e) => updateList('detalle', idx, { precio: Number(e.target.value) })}
                      className={`${inp} text-right`}
                    />
                  </td>
                  <td className={TD}>
                    <button type="button" onClick={() => removeRow('detalle', idx)} className="text-red-500">
                      <TrashIcon className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-800 text-white font-semibold">
                <td className={`${TD} bg-emerald-800 text-white`}>TOTAL GENERAL</td>
                <td className={`${TD} bg-emerald-800 text-white text-right tabular-nums`}>
                  {calc.detalle.reduce((s, d) => s + (Number(d.horas) || 0), 0).toFixed(1)} h
                </td>
                <td className={`${TD} bg-emerald-800 text-white text-right tabular-nums`}>
                  {fmt(calc.totales.detalle_total)}
                </td>
                <td className={`${TD} bg-emerald-800`} />
              </tr>
              <tr className="bg-emerald-700 text-white font-semibold">
                <td className={`${TD} bg-emerald-700 text-white`} colSpan={2}>
                  IGV {Number(igvPct).toFixed(0)}%
                </td>
                <td className={`${TD} bg-emerald-700 text-white text-right tabular-nums`}>
                  {fmt(calc.totales.detalle_igv)}
                </td>
                <td className={`${TD} bg-emerald-700`} />
              </tr>
              <tr className="bg-emerald-900 text-white font-bold">
                <td className={`${TD} bg-emerald-900 text-white`} colSpan={2}>
                  TOTAL FINAL
                </td>
                <td className={`${TD} bg-emerald-900 text-white text-right tabular-nums text-base`}>
                  {fmt(calc.totales.detalle_final)}
                </td>
                <td className={`${TD} bg-emerald-900`} />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Cuadro 4: Forma de pago */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-slate-700">Forma de pago</h4>
          <button
            type="button"
            onClick={() => addRow('pagos_forma', { descripcion: '', porcentaje: 0.25 })}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
          >
            <PlusIcon className="w-3 h-3" /> Fila
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className={TH}>Pagos vs entregables</th>
                <th className={`${TH} w-24`}>Porcentaje</th>
                <th className={`${TH} w-36`}>Forma de pago</th>
                <th className={`${TH} w-10`} />
              </tr>
            </thead>
            <tbody>
              {calc.pagos_forma.map((row, idx) => (
                <tr key={idx} className="bg-white">
                  <td className={TD}>
                    <input
                      value={row.descripcion || ''}
                      onChange={(e) => updateList('pagos_forma', idx, { descripcion: e.target.value })}
                      className={inp}
                    />
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        step="0.01"
                        value={pctDisplay(row.porcentaje)}
                        onChange={(e) => updateList('pagos_forma', idx, { porcentaje: pctStore(e.target.value) })}
                        className={`${inp} text-right w-14`}
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>
                  <td className={`${TD} text-right tabular-nums font-medium`}>{fmt(row.monto)}</td>
                  <td className={TD}>
                    <button type="button" onClick={() => removeRow('pagos_forma', idx)} className="text-red-500">
                      <TrashIcon className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {calc.pagos_forma.length > 0 && (
                <tr className="bg-slate-100 font-semibold">
                  <td className={TD} />
                  <td className={`${TD} text-right tabular-nums`}>
                    {pctDisplay(calc.pagos_forma.reduce((s, p) => s + (Number(p.porcentaje) || 0), 0)).toFixed(0)}%
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {fmt(calc.pagos_forma.reduce((s, p) => s + (Number(p.monto) || 0), 0))}
                  </td>
                  <td className={TD} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
        <div className="text-sm text-teal-800">Monto propuesta (al guardar)</div>
        <div className="text-2xl font-bold text-teal-900">
          {fmt(
            calc.totales.total_inversion > 0
              ? calc.totales.total_inversion
              : calc.totales.detalle_final > 0
                ? calc.totales.detalle_final
                : 0
          )}
        </div>
      </div>
    </div>
  );
};

export default CotizacionesPropuesta;
