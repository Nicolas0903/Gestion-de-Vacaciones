import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { exportarPropuestaEconomicaExcel } from '../../utils/exportPropuestaExcel';
import { formatoMontoRendicion } from '../../utils/monedaRendicion';
import { costosConRecursosDesdePerfiles } from '../../utils/cotizacionTiposProyecto';
import {
  inversionRolesDesdeCostos,
  monedaFacturacionPropuesta
} from '../../utils/cotizacionPropuestaInversion';
import {
  detalleDesdeInversionCalc,
  normalizarPreciosDetallePropuesta
} from '../../utils/detalleDesdeInversionPropuesta';
import { parcheNumInputEditable, valorNumInputEditable } from '../../utils/cotizacionNumInput';
import {
  limiteTotalFinalPropuesta,
  propuestaComercialExcedeLimite
} from '../../utils/cotizacionPropuestaLimite';
import { igvPctEfectivo, impuestoAplicaEnCostos } from '../../utils/cotizacionImpuesto';
import CotizacionEnviarAprobacion from './CotizacionEnviarAprobacion';
import CotizacionNotificarComercial from './CotizacionNotificarComercial';

const TH = 'bg-emerald-800 text-white font-semibold text-sm px-3 py-2 border border-emerald-900';
const TD = 'border border-slate-300 px-2 py-1.5 text-sm';
/** Celdas editables tipo Excel (comercial y elaboración). */
const inpExcel =
  'w-full min-w-0 border border-slate-400 bg-white px-2 py-1.5 text-sm rounded-sm shadow-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-500';
const inp = inpExcel;

const calcPropuestaLocal = (propuesta, igvPctNum = 18) => {
  const igvPct = Number(igvPctNum) / 100;
  const inversion_roles = (propuesta?.inversion_roles || []).map((item) => {
    const inversion = Number(item.inversion) || 0;
    const cantidad = Number(item.cantidad) || 1;
    const igv = Math.round(inversion * igvPct * 100) / 100;
    return { ...item, cantidad, inversion, igv, total: Math.round((inversion + igv) * 100) / 100 };
  });
  const inversion_total = Math.round(inversion_roles.reduce((s, i) => s + i.inversion, 0) * 100) / 100;
  const igv_inversion = Math.round(inversion_roles.reduce((s, i) => s + i.igv, 0) * 100) / 100;
  const total_inversion = Math.round(inversion_roles.reduce((s, i) => s + i.total, 0) * 100) / 100;

  const filasFormaPago =
    propuesta?.pagos_forma?.length > 0
      ? propuesta.pagos_forma
      : propuesta?.pagos_entregables || [];

  const detalle = normalizarPreciosDetallePropuesta(inversion_roles, propuesta?.detalle || []).map((d) => ({
    ...d,
    horas: Number(d.horas ?? d.semanas) || 0,
    precio: Number(d.precio) || 0
  }));
  const detalle_total = Math.round(detalle.reduce((s, d) => s + d.precio, 0) * 100) / 100;
  const detalle_igv = Math.round(detalle_total * igvPct * 100) / 100;
  const detalle_final = Math.round((detalle_total + detalle_igv) * 100) / 100;

  const pagos_forma = filasFormaPago.map((p) => {
    const porcentaje = Number(p.porcentaje) || 0;
    return { ...p, porcentaje, monto: Math.round(total_inversion * porcentaje * 100) / 100 };
  });

  return {
    inversion_roles,
    detalle,
    pagos_forma,
    totales: { inversion_total, igv_inversion, total_inversion, detalle_total, detalle_igv, detalle_final }
  };
};

const pctDisplay = (v) => Math.round((Number(v) || 0) * 10000) / 100;
const pctStore = (v) => Math.round(Number(v) * 100) / 10000;

const CotizacionesPropuesta = ({
  propuesta,
  costos,
  actividades,
  onChange,
  soloLectura = false,
  soloMontosLectura = false,
  edicionComercialConLimite = false,
  montoLimiteFinal = 0,
  ocultarSyncCostos = false,
  ocultarCierreComercial = false,
  puedeGestionarCierreComercial = false,
  cierreComercialEstado = 'borrador',
  onGuardarCierreComercial,
  onCerrarCierreComercial,
  onReabrirCierreComercial,
  accionesCierreCargando = false,
  cotizacionId,
  codigoCotizacion = '',
  clienteCotizacion = '',
  proyectoCotizacion = '',
  mostrarEnviarAprobacion = false,
  onSolicitudAprobacionEnviada,
  solicitanteComercial = null
}) => {
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const cierreCerrado = cierreComercialEstado === 'cerrado';
  const cierreEditable = puedeGestionarCierreComercial && !cierreCerrado;
  const bloqueaMontos = soloLectura || (soloMontosLectura && !edicionComercialConLimite);
  const puedeEditarCuadros = !bloqueaMontos;
  const puedeEditarParametros = puedeEditarCuadros || (!bloqueaMontos && !soloLectura);
  const moneda = monedaFacturacionPropuesta(propuesta, costos);
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const impuestoAplica = impuestoAplicaEnCostos(costos?.parametros);
  const igvPct = igvPctEfectivo(propuesta, costos);
  const igvPctGuardado = propuesta?.igv_pct ?? costos?.parametros?.igv_pct ?? 18;

  const calc = useMemo(() => calcPropuestaLocal(propuesta, igvPct), [propuesta, igvPct]);
  const limiteEfectivo = montoLimiteFinal || limiteTotalFinalPropuesta(propuesta);
  const excedeLimite = edicionComercialConLimite && propuestaComercialExcedeLimite(propuesta, calc.totales);
  const setProp = (patch) => {
    if (soloLectura) return;
    const keys = Object.keys(patch || {});
    if (edicionComercialConLimite) {
      const reservadoPresales = [
        'limite_total_final',
        'cierre_propuesta',
        'cierre_propuesta_at',
        'cierre_propuesta_nota',
        'cierre_comercial_estado',
        'cierre_comercial_cerrado_at',
        'cierre_comercial_cerrado_por'
      ];
      if (keys.some((k) => reservadoPresales.includes(k))) return;
    }
    if (soloMontosLectura && !edicionComercialConLimite) {
      const soloComercial = keys.every((k) =>
        ['cierre_propuesta', 'cierre_propuesta_at', 'cierre_propuesta_nota'].includes(k)
      );
      if (!soloComercial) return;
    }
    if (!cierreEditable) {
      const keys = Object.keys(patch || {});
      if (keys.some((k) => ['cierre_propuesta', 'cierre_propuesta_at', 'cierre_propuesta_nota'].includes(k))) {
        return;
      }
    }
    onChange({ ...propuesta, ...patch });
  };

  const updateList = (key, idx, patch) => {
    if (soloLectura) return;
    if (soloMontosLectura && !edicionComercialConLimite) {
      const campos = Object.keys(patch || {});
      const soloTexto = campos.every((f) => ['actividad', 'descripcion', 'entregable'].includes(f));
      if (!soloTexto) return;
    }
    if (!puedeEditarCuadros) return;
    const list = [...(propuesta[key] || [])];
    list[idx] = { ...list[idx], ...patch };
    setProp({ [key]: list });
  };

  const addRow = (key, defaults) => {
    if (!puedeEditarCuadros) return;
    setProp({ [key]: [...(propuesta[key] || []), defaults] });
  };

  const removeRow = (key, idx) => {
    if (!puedeEditarCuadros) return;
    setProp({ [key]: (propuesta[key] || []).filter((_, i) => i !== idx) });
  };

  const syncInversionDesdeCostos = () => {
    if (bloqueaMontos) return;
    const costosSync = costosConRecursosDesdePerfiles(actividades, costos);
    const roles = inversionRolesDesdeCostos(costosSync);
    if (!roles.length) {
      window.alert(
        'No hay recursos en Costos para sincronizar. Revisa salarios, horas y la proyección activa en la pestaña Costos.'
      );
      return;
    }
    const filasConDatos = (propuesta?.inversion_roles || []).some(
      (r) => String(r.actividad || '').trim() || Number(r.inversion) > 0
    );
    if (
      filasConDatos &&
      !window.confirm(
        'Se reemplazarán las filas de inversión con la proyección actual de Costos. ¿Continuar?'
      )
    ) {
      return;
    }
    const calcSync = calcPropuestaLocal({ ...propuesta, inversion_roles: roles }, igvPct);
    setProp({
      inversion_roles: roles,
      detalle: detalleDesdeInversionCalc(calcSync.inversion_roles, {
        nombrePropuesta: proyectoCotizacion,
        inversionTotal: calcSync.totales.inversion_total
      })
    });
  };

  const syncDetalleDesdeInversion = () => {
    if (bloqueaMontos) return;
    const det = detalleDesdeInversionCalc(calc.inversion_roles, {
      nombrePropuesta: proyectoCotizacion,
      inversionTotal: calc.totales.inversion_total
    });
    if (!det.length) {
      window.alert('Primero complete el cuadro de inversión por recursos.');
      return;
    }
    if (
      (propuesta?.detalle || []).some((d) => String(d.actividad || '').trim() || Number(d.precio) > 0) &&
      !window.confirm('Se reemplazará el detalle de propuesta según el cuadro de inversión. ¿Continuar?')
    ) {
      return;
    }
    setProp({ detalle: det });
  };

  const exportarExcel = () => {
    setExportandoExcel(true);
    try {
      const ok = exportarPropuestaEconomicaExcel({
        codigo: codigoCotizacion,
        cliente: clienteCotizacion,
        proyecto: proyectoCotizacion,
        moneda,
        igvPct,
        calc,
        limiteTotalFinal: limiteEfectivo
      });
      if (ok) toast.success('Excel de propuesta económica descargado.');
      else toast.error('No hay datos para exportar.');
    } catch {
      toast.error('No se pudo generar el Excel.');
    } finally {
      setExportandoExcel(false);
    }
  };


  return (
    <div className="space-y-8">
      {soloLectura && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Vista comercial de solo lectura. Para cambiar montos o cierre, el equipo de elaboración guarda desde su
          acceso.
        </p>
      )}
      {edicionComercialConLimite && (
        <p
          className={`text-sm rounded-lg px-3 py-2 border ${
            excedeLimite
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-950'
          }`}
        >
          Tope comercial (total final máximo): <strong>{fmt(limiteEfectivo || 0)}</strong>. Puedes editar moneda,
          IGV y todos los cuadros como en Excel; el total final no debe superar ese tope.
          {excedeLimite && (
            <span className="block mt-1 font-medium">Total actual {fmt(calc.totales.total_inversion)} — supera el tope.</span>
          )}
        </p>
      )}
      {soloMontosLectura && !soloLectura && !edicionComercialConLimite && (
        <p className="text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          Los <strong>montos e IGV</strong> los define presales. El <strong>cierre comercial</strong> (ganada / perdida)
          lo registran Magali, Enrique o administración.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Propuesta económica</h3>
          <p className="text-sm text-slate-500">
            Cuadros alineados al formato Excel · Moneda: {moneda === 'USD' ? 'Dólares ($)' : 'Soles (S/)'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportarExcel}
            disabled={exportandoExcel}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exportandoExcel ? 'Exportando…' : 'Exportar Excel'}
          </button>
        </div>
      </div>
      {puedeEditarParametros && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm mb-2">
          <label className="flex items-center gap-2">
            Moneda facturación
            <select
              value={moneda}
              onChange={(e) => setProp({ moneda_facturacion: e.target.value })}
              className="rounded border border-slate-400 bg-white px-2 py-1.5 shadow-sm"
            >
              <option value="PEN">PEN (S/)</option>
              <option value="USD">USD ($)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            IGV (%)
            <input
              type="number"
              step="0.01"
              disabled={!impuestoAplica}
              value={valorNumInputEditable(igvPctGuardado)}
              onChange={(e) => setProp({ igv_pct: parcheNumInputEditable(e.target.value) })}
              className="w-24 rounded border border-slate-400 bg-white px-2 py-1.5 shadow-sm disabled:bg-slate-100"
            />
          </label>
          {!impuestoAplica && (
            <span className="text-xs text-amber-800">Impuesto apagado en Costos → Parámetros.</span>
          )}
        </div>
      )}
      {!puedeEditarParametros && !soloLectura && (
        <p className="text-sm text-slate-600 mb-2">
          Moneda: {moneda === 'USD' ? 'USD ($)' : 'PEN (S/)'} · IGV: {igvPct}%
        </p>
      )}

      {/* Cuadro 1: Inversión por roles */}
      <section>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h4 className="font-medium text-slate-700">Inversión por recursos / roles</h4>
          {puedeEditarCuadros && (
          <div className="flex gap-2">
            {!ocultarSyncCostos && (
            <button
              type="button"
              onClick={syncInversionDesdeCostos}
              className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              Sincronizar desde costos
            </button>
            )}
            <button
              type="button"
              onClick={() => addRow('inversion_roles', { cantidad: 1, actividad: '', inversion: null })}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
            >
              <PlusIcon className="w-3 h-3" /> Fila
            </button>
          </div>
          )}
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
                      value={valorNumInputEditable(row.cantidad)}
                      onChange={(e) =>
                        updateList('inversion_roles', idx, {
                          cantidad: parcheNumInputEditable(e.target.value)
                        })
                      }
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
                      value={valorNumInputEditable(row.inversion)}
                      onChange={(e) =>
                        updateList('inversion_roles', idx, { inversion: parcheNumInputEditable(e.target.value) })
                      }
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

      {/* Cuadro 2: Detalle propuesta */}
      <section>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h4 className="font-medium text-slate-700">Detalle de propuesta</h4>
          <div className="flex gap-2">
            {puedeEditarCuadros && (
              <button
                type="button"
                onClick={syncDetalleDesdeInversion}
                className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50"
              >
                Sincronizar desde inversión
              </button>
            )}
            {puedeEditarCuadros && (
              <button
                type="button"
                onClick={() => addRow('detalle', { actividad: '', horas: null, precio: null })}
                title="Por defecto la sincronización deja una línea: nombre del proyecto + total sin IGV"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
              >
                <PlusIcon className="w-3 h-3" /> Fila
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className={TH}>Detalle de propuesta</th>
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
                      step="0.01"
                      value={valorNumInputEditable(row.precio)}
                      onChange={(e) =>
                        updateList('detalle', idx, { precio: parcheNumInputEditable(e.target.value) })
                      }
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
                  {fmt(calc.totales.detalle_total)}
                </td>
                <td className={`${TD} bg-emerald-800`} />
              </tr>
              {impuestoAplica && (
                <tr className="bg-emerald-700 text-white font-semibold">
                  <td className={`${TD} bg-emerald-700 text-white`}>IGV {Number(igvPct).toFixed(0)}%</td>
                  <td className={`${TD} bg-emerald-700 text-white text-right tabular-nums`}>
                    {fmt(calc.totales.detalle_igv)}
                  </td>
                  <td className={`${TD} bg-emerald-700`} />
                </tr>
              )}
              <tr className="bg-emerald-900 text-white font-bold">
                <td className={`${TD} bg-emerald-900 text-white`}>TOTAL FINAL</td>
                <td className={`${TD} bg-emerald-900 text-white text-right tabular-nums text-base`}>
                  {fmt(calc.totales.detalle_final)}
                </td>
                <td className={`${TD} bg-emerald-900`} />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Forma de pago (sobre total con IGV de inversión) */}
      <section>
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <div>
            <h4 className="font-medium text-slate-700">Forma de pago</h4>
            <p className="text-xs text-slate-500">
              Porcentajes sobre el total final de inversión ({fmt(calc.totales.total_inversion)}).
            </p>
          </div>
          {puedeEditarCuadros && (
            <button
              type="button"
              onClick={() => addRow('pagos_forma', { descripcion: '', porcentaje: 0.25 })}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-600 text-white"
            >
              <PlusIcon className="w-3 h-3" /> Fila
            </button>
          )}
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
                        value={
                          row.porcentaje === null || row.porcentaje === ''
                            ? ''
                            : pctDisplay(row.porcentaje)
                        }
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateList('pagos_forma', idx, {
                            porcentaje: raw === '' ? null : pctStore(raw)
                          });
                        }}
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

      {!ocultarCierreComercial && (
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-slate-800">Cierre comercial de la propuesta</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Edición en borrador y luego <strong>cerrar</strong> (Magali, Enrique o admin). Si marcas{' '}
              <strong>Ganada</strong> y cierras, la cotización pasa a estado ganada y se crea automáticamente el{' '}
              <strong>cierre de negocio</strong> (o queda listo en ese módulo si ya existía).
            </p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              cierreCerrado ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {cierreCerrado ? 'Cerrado' : 'Borrador'}
          </span>
        </div>
        {propuesta?.cierre_propuesta && (
          <p className="text-sm text-slate-700 capitalize">
            Resultado: <strong>{propuesta.cierre_propuesta}</strong>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'standby', label: 'Standby', active: 'bg-amber-100 border-amber-300 text-amber-950' },
            { id: 'ganada', label: 'Ganada', active: 'bg-emerald-100 border-emerald-400 text-emerald-900' },
            { id: 'perdida', label: 'Perdida', active: 'bg-red-100 border-red-300 text-red-900' }
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={!cierreEditable}
              onClick={() =>
                setProp({
                  cierre_propuesta: propuesta?.cierre_propuesta === opt.id ? null : opt.id,
                  cierre_propuesta_at:
                    propuesta?.cierre_propuesta === opt.id ? null : new Date().toISOString()
                })
              }
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 ${
                propuesta?.cierre_propuesta === opt.id
                  ? opt.active
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="block text-sm text-slate-600">
          Notas de cierre (opcional)
          <textarea
            rows={2}
            readOnly={!cierreEditable}
            value={propuesta?.cierre_propuesta_nota ?? ''}
            onChange={(e) => setProp({ cierre_propuesta_nota: e.target.value })}
            className={`mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm ${
              !cierreEditable ? 'bg-slate-50' : ''
            }`}
            placeholder="Motivo, competidor, fecha estimada de decisión…"
          />
        </label>
        {puedeGestionarCierreComercial && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {!cierreCerrado && (
              <>
                <button
                  type="button"
                  disabled={accionesCierreCargando}
                  onClick={() =>
                    onGuardarCierreComercial?.({
                      cierre_propuesta: propuesta?.cierre_propuesta ?? null,
                      cierre_propuesta_at: propuesta?.cierre_propuesta_at ?? null,
                      cierre_propuesta_nota: propuesta?.cierre_propuesta_nota ?? ''
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Guardar borrador cierre
                </button>
                <button
                  type="button"
                  disabled={accionesCierreCargando}
                  onClick={() =>
                    onCerrarCierreComercial?.({
                      cierre_propuesta: propuesta?.cierre_propuesta ?? null,
                      cierre_propuesta_nota: propuesta?.cierre_propuesta_nota ?? ''
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
                >
                  Cerrar cierre comercial
                </button>
              </>
            )}
            {cierreCerrado && (
              <button
                type="button"
                disabled={accionesCierreCargando}
                onClick={() => onReabrirCierreComercial?.()}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm disabled:opacity-50"
              >
                Reabrir para corrección
              </button>
            )}
          </div>
        )}
        {!puedeGestionarCierreComercial && (
          <p className="text-xs text-slate-500">Solo lectura. Contacte a Magali, Enrique o administración para cambios.</p>
        )}
      </section>
      )}

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

      {mostrarEnviarAprobacion && cotizacionId && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CotizacionNotificarComercial cotizacionId={cotizacionId} solicitanteComercial={solicitanteComercial} />
          <CotizacionEnviarAprobacion
            cotizacionId={cotizacionId}
            codigoCotizacion={codigoCotizacion}
            clienteCotizacion={clienteCotizacion}
            propuesta={propuesta}
            costos={costos}
            onSolicitudEnviada={onSolicitudAprobacionEnviada}
          />
        </div>
      )}
    </div>
  );
};

export default CotizacionesPropuesta;
