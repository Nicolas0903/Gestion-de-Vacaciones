import React, { useEffect, useMemo, useState } from 'react';
import { formatoMontoRendicion } from '../../utils/monedaRendicion';
import { cotizacionesService } from '../../services/api';

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

function tarifaGarantiaReferencia(recursos, indices, horasMes) {
  const hm = horasMes || 160;
  const rates = indices
    .map((i) => recursos[i])
    .filter(Boolean)
    .map((r) => (hm > 0 ? (Number(r.salario) || 0) / hm : 0))
    .filter((t) => t > 0);
  if (!rates.length) return 0;
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100;
}

const calcCostosLocal = (costosRaw) => {
  const params = costosRaw?.parametros || {};
  const horasMes = Number(params.horas_mes) || 160;
  const tipoCambio = Number(params.tipo_cambio) || 3.4;
  const monedaRec =
    String(params.moneda_recursos || 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN';
  const markups = (params.markups?.length ? params.markups : DEFAULT_MARKUPS)
    .slice(0, 4)
    .map((m) => Number(m) || 1);
  while (markups.length < 4) markups.push(DEFAULT_MARKUPS[markups.length] || 1);

  const recursos = (costosRaw?.recursos || []).map((r) => {
    const salario = Number(r.salario) || 0;
    const cantidad = Number(r.cantidad) || 1;
    const horas = Number(r.horas_asignadas ?? r.horas ?? r.tiempo_meses) || 0;
    const sobrecosto = Number(r.sobrecosto) || 1;
    const costoHora = horasMes > 0 ? Math.round((salario / horasMes) * 100) / 100 : 0;
    const costoDirecto = Math.round(costoHora * horas * cantidad * 100) / 100;
    const costoFinal = Math.round(costoDirecto * sobrecosto * 100) / 100;
    return { ...r, horas_asignadas: horas, costo_hora: costoHora, costo_directo: costoDirecto, costo_final: costoFinal };
  });

  const subtotal = Math.round(recursos.reduce((s, r) => s + r.costo_final, 0) * 100) / 100;

  const indicesGarantia = resolverIndicesGarantia(params);
  const horasGarantia = Number(params.horas_garantia ?? params.dias_garantia) || 0;
  const modoGarantia = String(params.garantia_modo || 'recursos').toLowerCase();
  let tarifaGarantia =
    modoGarantia === 'manual'
      ? Number(params.tarifa_garantia) || 0
      : tarifaGarantiaReferencia(recursos, indicesGarantia, horasMes);
  if (modoGarantia !== 'manual' && !tarifaGarantia) {
    tarifaGarantia = Number(params.tarifa_garantia) || 0;
  }
  tarifaGarantia = Math.round(tarifaGarantia * 100) / 100;
  const garantia =
    horasGarantia > 0 && tarifaGarantia > 0
      ? Math.round(tarifaGarantia * horasGarantia * 100) / 100
      : 0;

  const comisionPct = Number(params.comision_admin_pct ?? 10);
  const comision = Math.round(subtotal * (comisionPct / 100) * 100) / 100;
  const costoTotal = Math.round((subtotal + garantia + comision) * 100) / 100;

  const tc = tipoCambio > 0 ? tipoCambio : 1;
  const costoEnPen = monedaRec === 'PEN' ? costoTotal : Math.round(costoTotal * tc * 100) / 100;
  const costoEnUsd = monedaRec === 'USD' ? costoTotal : Math.round((costoTotal / tc) * 100) / 100;

  const monedaProy = String(params.moneda_proyeccion || 'USD').toUpperCase() === 'PEN' ? 'PEN' : 'USD';

  const proyeccionesUsd = markups.map((m) => Math.round(costoEnUsd * m * 100) / 100);
  const proyeccionesPen = markups.map((m) => Math.round(costoEnPen * m * 100) / 100);
  const proyecciones = monedaProy === 'PEN' ? proyeccionesPen : proyeccionesUsd;
  const costoBaseProy = monedaProy === 'PEN' ? costoEnPen : costoEnUsd;

  const proyActiva = Math.min(Math.max(Number(params.proyeccion_activa) || 0, 0), proyecciones.length - 1);
  const proyeccionSel = proyecciones[proyActiva] ?? 0;
  const igvPct = Number(params.igv_pct ?? 18);
  const igvProy = Math.round(proyeccionSel * (igvPct / 100) * 100) / 100;
  const precioFinal = Math.round((proyeccionSel + igvProy) * 100) / 100;
  const margen =
    proyeccionSel > 0 ? Math.round(((proyeccionSel - costoBaseProy) / proyeccionSel) * 10000) / 100 : 0;

  return {
    recursos,
    markups,
    proyActiva,
    monedaProy,
    monedaRec,
    resumen: {
      subtotal_recursos: subtotal,
      garantia,
      garantia_tarifa: tarifaGarantia,
      garantia_horas: horasGarantia,
      comision,
      comision_pct: comisionPct,
      costo_total: costoTotal,
      costo_total_usd: costoEnUsd,
      costo_total_pen: costoEnPen,
      costo_base_proyeccion: costoBaseProy,
      proyecciones,
      proyecciones_usd: proyeccionesUsd,
      proyecciones_pen: proyeccionesPen,
      proyeccion_seleccionada: proyeccionSel,
      igv_proyeccion: igvProy,
      precio_final_cliente: precioFinal,
      margen_pct: margen,
      igv_pct: igvPct
    }
  };
};

const TH = 'bg-emerald-800 text-white font-semibold text-xs px-2 py-2 border border-emerald-900 whitespace-nowrap';
const TD = 'border border-slate-300 px-2 py-1.5 text-sm';
const TDnum = `${TD} text-right tabular-nums`;
const inp = 'w-full rounded border border-slate-200 px-1.5 py-1 text-sm';

const CotizacionesCostos = ({ costos, codigo, versionActual, onChange }) => {
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
                <td colSpan={8} className="py-8 text-center text-slate-500">
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

            <tr className="bg-orange-100">
              <td className={`${TD} font-medium text-orange-900`}>
                <div className="flex flex-col gap-1">
                  <span>Garantía</span>
                  <button
                    type="button"
                    onClick={() => setPanelGarantia((v) => !v)}
                    className="text-left text-xs font-normal text-orange-800 underline hover:text-orange-950"
                  >
                    {panelGarantia ? 'Ocultar opciones' : 'Seleccionar / modificar'}
                  </button>
                </div>
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
                        {indicesGarantia.length > 1 && (
                          <p className="px-3 py-2 text-xs text-slate-600 bg-orange-50">
                            Tarifa aplicada (promedio): <strong>{fmtRec(tarifaRefGarantia)}</strong>/h
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
                <td className={`${TD} font-medium w-40`}>TOTAL GENERAL</td>
                <td className={`${TDnum} font-bold text-base`}>{fmtProy(res.proyeccion_seleccionada)}</td>
              </tr>
              <tr className="bg-white">
                <td className={TD}>IGV {res.igv_pct}%</td>
                <td className={TDnum}>{fmtProy(res.igv_proyeccion)}</td>
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
            IGV (%)
            <input
              type="number"
              step="0.01"
              value={params.igv_pct ?? 18}
              onChange={(e) => setParams({ igv_pct: Number(e.target.value) })}
              className="mt-1 w-full rounded border px-2 py-1.5"
            />
          </label>
          <p className="col-span-2 md:col-span-4 text-xs text-slate-500 -mt-1 mb-1">
            Garantía: usa <strong>Seleccionar / modificar</strong> en la fila naranja (recursos o tarifa manual).
          </p>
          <label>
            Moneda facturación (propuesta)
            <select
              value={params.moneda || 'USD'}
              onChange={(e) => setParams({ moneda: e.target.value })}
              className="mt-1 w-full rounded border px-2 py-1.5"
            >
              <option value="USD">USD ($)</option>
              <option value="PEN">PEN (S/)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CotizacionesCostos;
