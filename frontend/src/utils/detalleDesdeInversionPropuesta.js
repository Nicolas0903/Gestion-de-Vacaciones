/** Una sola línea: nombre de la propuesta + total inversión sin IGV. */
export function detalleDesdeInversionCalc(inversionRolesCalc, opts = {}) {
  const nombrePropuesta = String(opts.nombrePropuesta || '').trim();
  let total = opts.inversionTotal;
  if (total == null || total === '') {
    total = (inversionRolesCalc || []).reduce((s, r) => s + (Number(r.inversion) || 0), 0);
  }
  total = Math.round(Number(total) * 100) / 100;
  if (total <= 0 && !nombrePropuesta) return [];
  return [
    {
      actividad: nombrePropuesta || 'Propuesta',
      horas: 0,
      precio: total > 0 ? total : null
    }
  ];
}

/** Corrige filas antiguas con precio = total con IGV por fila (legacy multi-perfil). */
export function normalizarPreciosDetallePropuesta(inversionRolesCalc, detalleRaw) {
  const roles = inversionRolesCalc || [];
  const detalle = detalleRaw || [];
  if (detalle.length !== roles.length) return detalle;
  return detalle.map((d, i) => {
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
