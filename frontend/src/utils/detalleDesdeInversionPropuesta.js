/** Cuadro detalle alineado a inversión por roles (solo descripción + precio total por fila). */
export function detalleDesdeInversionCalc(inversionRolesCalc) {
  return (inversionRolesCalc || []).map((r) => ({
    actividad: String(r.actividad || '').trim(),
    horas: 0,
    precio: Number(r.total) > 0 ? Number(r.total) : Number(r.inversion) || 0
  }));
}
