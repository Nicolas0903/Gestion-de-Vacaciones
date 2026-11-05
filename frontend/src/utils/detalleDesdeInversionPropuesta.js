/** Precio por fila = base sin IGV (columna Inversión), no el Total Final. */
export function detalleDesdeInversionCalc(inversionRolesCalc) {
  return (inversionRolesCalc || []).map((r) => ({
    actividad: String(r.actividad || '').trim(),
    horas: 0,
    precio: Number(r.inversion) || 0
  }));
}

/** Corrige filas guardadas con precio = total con IGV (doble impuesto en el cuadro). */
export function normalizarPreciosDetallePropuesta(inversionRolesCalc, detalleRaw) {
  const roles = inversionRolesCalc || [];
  return (detalleRaw || []).map((d, i) => {
    const precio = Number(d.precio) || 0;
    const role = roles[i];
    if (!role || precio <= 0) return d;
    const inv = Number(role.inversion) || 0;
    const tot = Number(role.total) || 0;
    if (tot > 0 && inv > 0 && Math.abs(precio - tot) < 0.02 && Math.abs(precio - inv) > 0.02) {
      return { ...d, precio: inv };
    }
    return d;
  });
}
