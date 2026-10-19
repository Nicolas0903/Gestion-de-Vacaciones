function fmt(n) {
  if (n == null || n === '') return '—';
  if (typeof n === 'number') return Number.isInteger(n) ? String(n) : n.toFixed(2);
  return String(n);
}

function push(cambios, campo, antes, despues) {
  const a = fmt(antes);
  const d = fmt(despues);
  if (a === d) return;
  cambios.push({ campo, antes: a, despues: d });
}

function diffCotizacionSnapshots(anterior, actual) {
  if (!anterior) {
    return [{ campo: 'Registro', antes: '—', despues: 'Versión inicial' }];
  }
  const cambios = [];
  const g0 = anterior.general || {};
  const g1 = actual.general || {};
  push(cambios, 'Cliente', g0.cliente, g1.cliente);
  push(cambios, 'Proyecto', g0.nombre_proyecto, g1.nombre_proyecto);
  push(cambios, 'Tipo de proyecto', g0.tipo_proyecto, g1.tipo_proyecto);
  push(cambios, 'Estado', g0.estado, g1.estado);
  push(cambios, 'Notas internas', g0.notas_internas, g1.notas_internas);

  const a0 = anterior.actividades || {};
  const a1 = actual.actividades || {};
  push(cambios, 'Horas perfiles', a0.total_horas_perfiles, a1.total_horas_perfiles);
  push(cambios, 'Horas actividades', a0.horas_actividades ?? a0.total_horas, a1.horas_actividades ?? a1.total_horas);
  push(cambios, 'Cantidad perfiles', (a0.perfiles || []).length, (a1.perfiles || []).length);

  const c0 = anterior.calculados || anterior.costos?.resumen || {};
  const c1 = actual.calculados || actual.costos?.resumen || {};
  push(cambios, 'Costo total', c0.costo_total, c1.costo_total);
  push(cambios, 'Monto propuesta', c0.monto_propuesta, c1.monto_propuesta);
  push(cambios, 'Precio final cliente', c0.precio_final_cliente, c1.precio_final_cliente);

  const p0 = anterior.costos?.parametros || {};
  const p1 = actual.costos?.parametros || {};
  push(cambios, 'Moneda recursos', p0.moneda_recursos, p1.moneda_recursos);
  push(cambios, 'Tipo de cambio', p0.tipo_cambio, p1.tipo_cambio);

  if (!cambios.length) {
    cambios.push({ campo: 'Detalle', antes: '—', despues: 'Ajustes menores (sin diferencias en totales clave)' });
  }
  return cambios;
}

module.exports = { diffCotizacionSnapshots };
