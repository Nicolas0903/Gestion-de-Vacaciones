import { calcCostosLocal } from './cotizacionCostosCalc';

function costoRecursoEnMonedaProyeccion(costoFinal, monedaRec, monedaProy, tipoCambio) {
  const tc = tipoCambio > 0 ? tipoCambio : 1;
  if (monedaProy === monedaRec) return costoFinal;
  if (monedaRec === 'PEN' && monedaProy === 'USD') return Math.round((costoFinal / tc) * 100) / 100;
  return Math.round(costoFinal * tc * 100) / 100;
}

/**
 * Reparte la proyección seleccionada (Costos) entre recursos participantes.
 * Permite volver a sincronizar cuando cambian markups, TC o salarios.
 */
export function inversionRolesDesdeCostos(costosRaw) {
  const { recursos, monedaProy, monedaRec, resumen } = calcCostosLocal(costosRaw);
  const params = costosRaw?.parametros || {};
  const participantes = recursos.filter((r) => !r.es_informativo);
  if (!participantes.length) return [];

  const objetivo = Number(resumen.proyeccion_seleccionada) || 0;
  const tc = Number(params.tipo_cambio) || 3.4;

  const bases = participantes.map((r) =>
    costoRecursoEnMonedaProyeccion(r.costo_final, monedaRec, monedaProy, tc)
  );
  const baseTotal = bases.reduce((s, n) => s + n, 0);

  if (objetivo > 0 && baseTotal > 0) {
    const roles = participantes.map((r, i) => ({
      cantidad: Number(r.cantidad) || 1,
      actividad: r.rol || 'Recurso',
      inversion: Math.round((bases[i] / baseTotal) * objetivo * 100) / 100
    }));
    const sum = roles.reduce((s, row) => s + row.inversion, 0);
    const diff = Math.round((objetivo - sum) * 100) / 100;
    if (roles.length && diff !== 0) {
      roles[roles.length - 1].inversion = Math.round((roles[roles.length - 1].inversion + diff) * 100) / 100;
    }
    return roles;
  }

  const hm = Number(params.horas_mes) || 160;
  return participantes.map((r) => {
    const horas = Number(r.horas_asignadas ?? r.horas) || 0;
    const salario = Number(r.salario) || 0;
    const cantidad = Number(r.cantidad) || 1;
    const sobrecosto = Number(r.sobrecosto) || 1;
    const inversion = Math.round((salario / hm) * horas * cantidad * sobrecosto * 100) / 100;
    return { cantidad, actividad: r.rol || 'Recurso', inversion };
  });
}

export function monedaFacturacionPropuesta(propuesta, costos) {
  const raw =
    propuesta?.moneda_facturacion ??
    propuesta?.moneda ??
    costos?.parametros?.moneda ??
    'PEN';
  return String(raw).toUpperCase() === 'USD' ? 'USD' : 'PEN';
}
