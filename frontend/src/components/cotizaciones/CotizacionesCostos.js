import React, { useEffect, useMemo, useState } from 'react';
import { formatoMontoRendicion } from '../../utils/monedaRendicion';
import { calcCostosLocal, tarifaGarantiaReferencia } from '../../utils/cotizacionCostosCalc';
import { cotizacionesService } from '../../services/api';
import CotizacionEnviarAprobacion from './CotizacionEnviarAprobacion';

const DEFAULT_MARKUPS = [1.9, 1.6, 1.7, 1.43];
const fmtPen = (n) => formatoMontoRendicion(n, 'PEN');
const fmtUsd = (n) => formatoMontoRendicion(n, 'USD');

function resolverIndicesGarantia(params) {
  if (Array.isArray(params?.recursos_garantia_idx) && params.recursos_garantia_idx.length) {
    return [...new Set(params.recursos_garantia_idx.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 0))];
  }
  const one = Number(params?.recurso_garantia_idx);
  return Number.isFinite(one) ? [one] : [0];
}

const TH = 'bg-emerald-800 text-white font-semibold text-xs px-2 py-2 border border-emerald-900 whitespace-nowrap';
const TD = 'border border-slate-300 px-2 py-1.5 text-sm';
const TDnum = `${TD} text-right tabular-nums`;
const inp = 'w-full rounded border border-slate-200 px-1.5 py-1 text-sm';

const CotizacionesCostos = ({
  costos,
  codigo,
  versionActual,
  onChange,
  cotizacionId,
  codigoCotizacion,
  clienteCotizacion,
  propuesta,
  mostrarEnviarAprobacion = false,
  onSolicitudAprobacionEnviada
}) => {
  const params = costos?.parametros || {};
  const { recursos, markups, proyActiva, monedaProy, monedaRec, resumen: res } = useMemo(
    () => calcCostosLocal(costos),
    [costos]
  );
  const fmtRec = monedaRec === 'USD' ? fmtUsd : fmtPen;
  const fmtProy = monedaProy === 'PEN' ? fmtPen : fmtUsd;
  const symRec = monedaRec === 'USD' ? '$' : 'S/';

  const [sunatTc, setSunatTc] = useState(null);
  const [sunatErr, setSunatErr] = useState('');
  const [panelGarantia, setPanelGarantia] = useState(false);
  const modoGarantia = String(params.garantia_modo || 'recursos').toLowerCase() === 'manual' ? 'manual' : 'recursos';

  useEffect(() => {
    let cancel = false;
    cotizacionesService
      .tipoCambioSunat()
      .then(({ data }) => {
        if (!cancel) {
          setSunatTc(data.data);
          setSunatErr('');
        }
      })
      .catch(() => {
        if (!cancel) setSunatErr('No disponible');
      });
    return () => {
      cancel = true;
    };
  }, []);

  const setParams = (patch) =>
    onChange({ ...costos, parametros: { ...params, ...patch } });

  const indicesGarantia = resolverIndicesGarantia(params);
  const hmGarantia = Number(params.horas_mes) || 160;
  const tarifaRefGarantia = tarifaGarantiaReferencia(recursos, indicesGarantia, hmGarantia);

  const toggleRefGarantia = (idx) => {
    const set = new Set(indicesGarantia);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    const next = [...set].sort((a, b) => a - b);
    const tarifa = tarifaGarantiaReferencia(recursos, next, hmGarantia);
    setParams({
      recursos_garantia_idx: next,
      recurso_garantia_idx: next[0] ?? 0,
      tarifa_garantia: next.length ? tarifa : null
    });
  };

  const updateRecurso = (idx, patch) => {
    const next = recursos.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange({ ...costos, recursos: next });
  };

  const setMarkup = (idx, val) => {
    const next = [...markups];
    next[idx] = Number(val) || 1;
    setParams({ markups: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Costos del proyecto</h3>
          <p className="text-sm text-slate-500">
            {codigo} · V{versionActual || 1} · Una fila por perfil definido en Actividades (rol y horas).
          </p>
        </div>
        <label className="text-sm text-slate-600 flex items-center gap-2">
          Moneda del cuadro
          <select
            value={params.moneda_recursos || 'PEN'}
            onChange={(e) => setParams({ moneda_recursos: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium bg-white"
          >
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares ($)</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-300">
        <table className="w-full border-collapse min-w-[900px] text-sm">
          <thead>
            <tr>
              <th className={TH}>Recurso</th>
              <th className={`${TH} w-32`}>Consultor</th>
              <th className={`${TH} w-16`}>Cantidad</th>
              <th className={`${TH} w-24`}>Salario ({symRec})</th>
              <th className={`${TH} w-24`}>Horas asignadas</th>
              <th className={`${TH} w-24`}>Costo/Hora</th>
              <th className={`${TH} w-28`}>Costo directo</th>
              <th className={`${TH} w-20`}>Sobre costo</th>
              <th className={`${TH} w-28`}>Costo final</th>
            </tr>
          </thead>
          <tbody>
            {recursos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Agrega perfiles en la pestaña <strong>Actividades</strong> para generar este cuadro.
                </td>
              </tr>
            )}
            {recursos.map((r, idx) => (
              <tr key={r.id || idx} className="bg-emerald-50/40">
                <td className={TD}>
                  <span className="block px-1 text-slate-800">{r.rol || '—'}</span>
                </td>
                <td className={TD}>
                  <input
                    value={r.consultor_nombre ?? ''}
                    onChange={(e) => updateRecurso(idx, { consultor_nombre: e.target.value })}
                    placeholder="Consultor"
                    className={`${inp} text-slate-800`}
                  />
                </td>
                <td className={TD}>
                  <input
                    type="number"
                    min="0"
                    value={r.cantidad ?? 1}
                    onChange={(e) => updateRecurso(idx, { cantidad: Number(e.target.value) })}
                    className={`${inp} text-center`}
                  />
                </td>
                <td className={TD}>
                  <input
                    type="number"
                    value={r.salario ?? 0}
                    onChange={(e) => updateRecurso(idx, { salario: Number(e.target.value) })}
                    className={`${inp} text-right`}
                  />
                </td>
                <td className={TD}>
                  <span className="block px-1 text-right tabular-nums text-slate-700">
                    {r.horas_asignadas ?? 0}
                  </span>
                </td>
                <td className={TDnum}>{fmtRec(r.costo_hora)}</td>
                <td className={TDnum}>{fmtRec(r.costo_directo)}</td>
                <td className={TD}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.sobrecosto ?? 1}
                    onChange={(e) => updateRecurso(idx, { sobrecosto: Number(e.target.value) })}
                    className={`${inp} text-center`}
                  />
                </td>
                <td className={`${TDnum} font-medium`}>{fmtRec(r.costo_final)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 space-y-2" aria-labelledby="costos-garantia-titulo">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-orange-200 pb-2">
          <div>
            <h4 id="costos-garantia-titulo" className="text-sm font-semibold text-orange-950">
              Garantía de servicio
            </h4>
            <p className="text-xs text-orange-900/70 mt-0.5">
              Bloque aparte de los recursos (mismo cálculo y suma en el costo total).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPanelGarantia((v) => !v)}
            className="text-xs text-orange-800 underline hover:text-orange-950 shrink-0"
          >
            {panelGarantia ? 'Ocultar opciones' : 'Seleccionar / modificar'}
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border-2 border-orange-200 bg-orange-50/30 shadow-sm">
          <table className="w-full border-collapse min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className={`${TH} bg-orange-800 border-orange-900`}>Concepto</th>
                <th className={`${TH} w-16 bg-orange-800 border-orange-900`}>Cantidad</th>
                <th className={`${TH} w-24 bg-orange-800 border-orange-900`}>Tarifa ({symRec})</th>
                <th className={`${TH} w-24 bg-orange-800 border-orange-900`}>Descripción / plazo</th>
                <th className={`${TH} w-24 bg-orange-800 border-orange-900`}>Horas</th>
                <th className={`${TH} w-28 bg-orange-800 border-orange-900`}>Importe</th>
                <th className={`${TH} w-20 bg-orange-800 border-orange-900`}>Factor</th>
                <th className={`${TH} w-28 bg-orange-800 border-orange-900`}>Costo final</th>
              </tr>
            </thead>
            <tbody>
            <tr className="bg-orange-100/90">
              <td className={`${TD} font-medium text-orange-900`}>
                <span>Garantía</span>
              </td>
              <td className={`${TD} text-center text-orange-700/60`}>—</td>
              <td className={TD}>
                {modoGarantia === 'manual' ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    title="Tarifa por hora (monto personalizado)"
                    value={params.tarifa_garantia ?? ''}
                    onChange={(e) =>
                      setParams({
                        garantia_modo: 'manual',
                        tarifa_garantia: e.target.value === '' ? null : Number(e.target.value)
                      })
                    }
                    className={`${inp} text-right bg-orange-50`}
                  />
                ) : (
                  <span className="block px-1 text-right tabular-nums text-orange-900 font-medium">
                    {fmtRec(tarifaRefGarantia || 0)}
                  </span>
                )}
              </td>
              <td className={TD}>
                <input
                  type="text"
                  value={params.texto_garantia ?? ''}
                  placeholder="Garantía 1 mes y 15 días"
                  onChange={(e) => setParams({ texto_garantia: e.target.value })}
                  className={`${inp} bg-orange-50 text-slate-700`}
                />
              </td>
              <td className={TD}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  title="Horas (como en Excel, col. Costo/Hora)"
                  value={params.horas_garantia ?? params.dias_garantia ?? 0}
                  onChange={(e) => setParams({ horas_garantia: Number(e.target.value) })}
                  className={`${inp} text-right bg-orange-50 font-medium`}
                />
              </td>
              <td className={TDnum}>{fmtRec(res.garantia)}</td>
              <td className={`${TD} text-center text-orange-800`}>1</td>
              <td className={`${TDnum} font-semibold text-orange-900`}>{fmtRec(res.garantia)}</td>
            </tr>

            {panelGarantia && (
              <tr className="bg-orange-50/80">
                <td colSpan={8} className={`${TD} py-3`}>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex rounded-lg border border-orange-200 overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setParams({
                            garantia_modo: 'recursos',
                            tarifa_garantia: tarifaRefGarantia || null
                          })
                        }
                        className={`px-3 py-1.5 ${
                          modoGarantia === 'recursos' ? 'bg-orange-200 font-medium' : 'bg-white hover:bg-orange-50'
                        }`}
                      >
                        Por recursos
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setParams({
                            garantia_modo: 'manual',
                            tarifa_garantia: params.tarifa_garantia ?? tarifaRefGarantia ?? 0
                          })
                        }
                        className={`px-3 py-1.5 border-l border-orange-200 ${
                          modoGarantia === 'manual' ? 'bg-orange-200 font-medium' : 'bg-white hover:bg-orange-50'
                        }`}
                      >
                        Monto personalizado
                      </button>
                    </div>
                    {modoGarantia === 'recursos' ? (
                      <div className="flex-1 min-w-[240px] rounded-lg border bg-white divide-y max-h-36 overflow-y-auto">
                        {recursos.map((r, i) => (
                          <label
                            key={r.id || i}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={indicesGarantia.includes(i)}
                              onChange={() => toggleRefGarantia(i)}
                            />
                            <span>{r.rol || `Recurso ${i + 1}`}</span>
                            <span className="text-xs text-slate-400 ml-auto tabular-nums">
                              {fmtRec(tarifaGarantiaReferencia(recursos, [i], hmGarantia))}/h
                            </span>
                          </label>
                        ))}
                        {indicesGarantia.length > 0 && (
                          <p className="px-3 py-2 text-xs text-slate-600 bg-orange-50">
                            {indicesGarantia.length > 1 ? (
                              <>
                                Total costo/hora (suma de {indicesGarantia.length} recursos):{' '}
                                <strong>{fmtRec(tarifaRefGarantia)}</strong>/h
                              </>
                            ) : (
                              <>
                                Costo/hora del recurso: <strong>{fmtRec(tarifaRefGarantia)}</strong>/h
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <label className="text-sm text-slate-700 flex flex-col gap-1">
                        Tarifa/hora (S/ o $)
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={params.tarifa_garantia ?? ''}
                          onChange={(e) =>
                            setParams({
                              garantia_modo: 'manual',
                              tarifa_garantia: e.target.value === '' ? null : Number(e.target.value)
                            })
                          }
                          className="w-40 rounded border px-2 py-1.5"
                        />
                      </label>
                    )}
                  </div>
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-300">
        <table className="w-full border-collapse min-w-[900px] text-sm">
          <tbody>
            <tr className="bg-blue-100">
              <td className={`${TD} font-medium text-blue-900`} colSpan={3}>
                Comisión o Gastos Administrativos
              </td>
              <td className={TD}>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={params.comision_admin_pct ?? 10}
                    onChange={(e) => setParams({ comision_admin_pct: Number(e.target.value) })}
                    className={`${inp} text-right bg-blue-50 w-16`}
                  />
                  <span className="text-blue-800 text-xs">%</span>
                </div>
              </td>
              <td className={`${TD} text-xs text-blue-800`} colSpan={3}>
                {res.comision_pct}% sobre subtotal ({fmtRec(res.subtotal_recursos)})
              </td>
              <td className={`${TDnum} font-semibold text-blue-900`}>{fmtRec(res.comision)}</td>
            </tr>

            <tr className="bg-slate-200 font-bold">
              <td className={`${TD} text-slate-800`} colSpan={7}>
                Costo total final ({symRec})
              </td>
              <td className={`${TDnum} text-slate-900 text-base`}>{fmtRec(res.costo_total)}</td>
            </tr>
            {monedaRec === 'PEN' && (
              <tr className="bg-slate-100">
                <td className={`${TD} text-slate-700`} colSpan={7}>
                  Costo del proyecto (US$) — comparación
                </td>
                <td className={`${TDnum} text-slate-800 font-semibold`}>{fmtUsd(res.costo_total_usd)}</td>
              </tr>
            )}
            {monedaRec === 'USD' && (
              <tr className="bg-slate-100">
                <td className={`${TD} text-slate-700`} colSpan={7}>
                  Costo del proyecto (S/) — comparación
                </td>
                <td className={`${TDnum} text-slate-800 font-semibold`}>{fmtPen(res.costo_total_pen)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-700">Proyecciones</h4>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs text-slate-600 flex items-center gap-1.5">
                Moneda proyección
                <select
                  value={params.moneda_proyeccion || 'USD'}
                  onChange={(e) => setParams({ moneda_proyeccion: e.target.value })}
                  className="rounded border px-2 py-1 text-sm bg-white font-medium"
                >
                  <option value="USD">USD ($)</option>
                  <option value="PEN">PEN (S/)</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">
                Tipo de cambio (S/ por US$)
                <input
                  type="number"
                  step="0.001"
                  value={params.tipo_cambio ?? 3.4}
                  onChange={(e) => setParams({ tipo_cambio: Number(e.target.value) })}
                  className="ml-2 w-24 rounded border px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>

          {sunatTc && (
            <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Referencial SUNAT ({sunatTc.fecha}): compra{' '}
                <strong className="text-slate-800">{sunatTc.compra}</strong> · venta{' '}
                <strong className="text-slate-800">{sunatTc.venta}</strong>
              </span>
              <button
                type="button"
                className="text-teal-700 hover:underline"
                onClick={() => setParams({ tipo_cambio: sunatTc.compra })}
              >
                Usar compra
              </button>
              <button
                type="button"
                className="text-teal-700 hover:underline"
                onClick={() => setParams({ tipo_cambio: sunatTc.venta })}
              >
                Usar venta
              </button>
            </div>
          )}
          {sunatErr && !sunatTc && (
            <p className="mb-2 text-xs text-slate-400">
              Tipo de cambio SUNAT no disponible ahora; ingresa el valor manualmente.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${TH} w-36`} />
                  {markups.map((_, i) => (
                    <th key={i} className={TH}>
                      Escenario {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className={`${TD} font-medium`}>Costo del proyecto</td>
                  {markups.map((_, i) => (
                    <td key={i} className={`${TDnum} font-medium`}>
                      {i === 0 ? fmtProy(res.costo_base_proyeccion) : ''}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/60">
                  <td className={`${TD} font-medium`}>Markup</td>
                  {markups.map((m, i) => (
                    <td key={i} className={TD}>
                      <input
                        type="number"
                        step="0.01"
                        value={m}
                        onChange={(e) => setMarkup(i, e.target.value)}
                        className="w-full rounded border border-emerald-200 px-2 py-1 text-center tabular-nums"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="bg-white">
                  <td className={`${TD} font-medium`}>Proyección</td>
                  {res.proyecciones.map((p, i) => (
                    <td
                      key={i}
                      className={`${TDnum} font-semibold cursor-pointer ${
                        proyActiva === i ? 'bg-teal-100 ring-2 ring-teal-500 ring-inset' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setParams({ proyeccion_activa: i })}
                    >
                      {fmtProy(p)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cuadro en {symRec}
            {monedaProy !== monedaRec && (
              <>
                {' '}
                → proyección en {monedaProy === 'PEN' ? 'S/' : '$'} con TC {params.tipo_cambio || 3.4}
              </>
            )}
            . Clic en una proyección para el precio al cliente.
          </p>
        </div>

        <div className="xl:col-span-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-700">Precio final para el cliente</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {monedaProy === 'PEN' ? 'S/' : '$'}
            </span>
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="bg-white">
                <td className={`${TD} font-medium w-40 align-top pt-2`}>
                  TOTAL GENERAL
                  <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Calculado: {fmtProy(res.proyeccion_auto)}
                  </p>
                </td>
                <td className={TD}>
                  <input
                    type="number"
                    step="0.01"
                    className={`${inp} text-right font-bold text-base`}
                    value={
                      params.total_general_manual != null && params.total_general_manual !== ''
                        ? params.total_general_manual
                        : res.total_general ?? ''
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setParams({
                        total_general_manual: v === '' ? null : Number(v)
                      });
                    }}
                    title="Editable para redondeo; por defecto usa la proyección activa"
                  />
                </td>
              </tr>
              <tr className="bg-white">
                <td className={`${TD} align-top`}>
                  <div className="space-y-1.5">
                    <select
                      value={params.impuesto_tipo || 'igv'}
                      onChange={(e) => {
                        const t = e.target.value;
                        const patch = { impuesto_tipo: t, impuesto_monto: null };
                        if (t === 'igv') patch.igv_pct = params.impuesto_pct ?? params.igv_pct ?? 18;
                        setParams(patch);
                      }}
                      className="w-full rounded border px-2 py-1 text-sm bg-white"
                    >
                      <option value="igv">IGV</option>
                      <option value="renta">Impuesto a la renta</option>
                      <option value="otros">Otros</option>
                    </select>
                    {(params.impuesto_tipo || 'igv') !== 'otros' && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={params.impuesto_pct ?? params.igv_pct ?? 18}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          const patch = { impuesto_pct: n, impuesto_monto: null };
                          if ((params.impuesto_tipo || 'igv') === 'igv') patch.igv_pct = n;
                          setParams(patch);
                        }}
                        placeholder="%"
                      />
                    )}
                    {(params.impuesto_tipo || 'igv') === 'otros' && (
                      <input
                        type="text"
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={params.impuesto_otros_etiqueta ?? ''}
                        onChange={(e) => setParams({ impuesto_otros_etiqueta: e.target.value })}
                        placeholder="Nombre del impuesto"
                      />
                    )}
                  </div>
                </td>
                <td className={TD}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`${inp} text-right`}
                    value={
                      params.impuesto_monto != null && params.impuesto_monto !== ''
                        ? params.impuesto_monto
                        : res.impuesto_monto ?? ''
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setParams({ impuesto_monto: v === '' ? null : Number(v) });
                    }}
                    title={`Sugerido: ${fmtProy(res.impuesto_monto_auto ?? 0)}`}
                  />
                  <p className="text-[11px] text-slate-500 mt-1 text-right">
                    {res.impuesto_etiqueta || 'Impuesto'}
                    {(params.impuesto_tipo || 'igv') !== 'otros' && res.impuesto_pct != null
                      ? ` ${res.impuesto_pct}%`
                      : ''}
                  </p>
                </td>
              </tr>
              <tr className="bg-emerald-800 text-white">
                <td className="border border-emerald-900 px-3 py-2 font-bold">TOTAL FINAL</td>
                <td className="border border-emerald-900 px-3 py-2 text-right font-bold text-base tabular-nums">
                  {fmtProy(res.precio_final_cliente)}
                </td>
              </tr>
              <tr className="bg-slate-100">
                <td className={`${TD} font-medium`}>Margen</td>
                <td className={`${TDnum} font-semibold text-teal-700`}>{res.margen_pct.toFixed(0)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {mostrarEnviarAprobacion && cotizacionId && (
        <CotizacionEnviarAprobacion
          cotizacionId={cotizacionId}
          codigoCotizacion={codigoCotizacion || codigo}
          clienteCotizacion={clienteCotizacion}
          propuesta={propuesta}
          costos={costos}
          onSolicitudEnviada={onSolicitudAprobacionEnviada}
        />
      )}

      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
        <h4 className="font-semibold text-slate-700 mb-3 text-sm">Parámetros</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <label>
            Horas/mes referencia
            <input
              type="number"
              value={params.horas_mes ?? 160}
              onChange={(e) => setParams({ horas_mes: Number(e.target.value) })}
              className="mt-1 w-full rounded border px-2 py-1.5"
            />
          </label>
          <label>
            Impuesto (precio cliente)
            <select
              value={params.impuesto_tipo || 'igv'}
              onChange={(e) => setParams({ impuesto_tipo: e.target.value, impuesto_monto: null })}
              className="mt-1 w-full rounded border px-2 py-1.5 bg-white"
            >
              <option value="igv">IGV</option>
              <option value="renta">Impuesto a la renta</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          {(params.impuesto_tipo || 'igv') !== 'otros' ? (
            <label>
              {(params.impuesto_tipo || 'igv') === 'renta' ? 'Imp. renta (%)' : 'IGV (%)'}
              <input
                type="number"
                step="0.01"
                value={params.impuesto_pct ?? params.igv_pct ?? 18}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  const patch = { impuesto_pct: n, impuesto_monto: null };
                  if ((params.impuesto_tipo || 'igv') === 'igv') patch.igv_pct = n;
                  setParams(patch);
                }}
                className="mt-1 w-full rounded border px-2 py-1.5"
              />
            </label>
          ) : (
            <label>
              Etiqueta impuesto
              <input
                type="text"
                value={params.impuesto_otros_etiqueta ?? ''}
                onChange={(e) => setParams({ impuesto_otros_etiqueta: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5"
                placeholder="Otros impuestos"
              />
            </label>
          )}
          <p className="col-span-2 md:col-span-4 text-xs text-slate-500 -mt-1 mb-1">
            Garantía: bloque naranja debajo de recursos → <strong>Seleccionar / modificar</strong> (por recursos o tarifa manual).
            La moneda de la propuesta al cliente se define en la pestaña <strong>Propuesta</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CotizacionesCostos;
