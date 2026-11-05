/** YYYY-MM-DD para inputs type="date". */
export function fechaInputDesdeIso(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

/** Rellena campos comerciales desde solicitud vinculada o creación de la cotización. */
export function generalConMetadatosComercial(general, { solicitud, cotizacionCreatedAt } = {}) {
  const g = { ...(general || {}) };
  const sol = solicitud || {};
  if (!g.fecha_subida) {
    g.fecha_subida =
      fechaInputDesdeIso(sol.fecha_subida) ||
      fechaInputDesdeIso(sol.created_at) ||
      fechaInputDesdeIso(cotizacionCreatedAt);
  }
  if (!g.fecha_deadline_propuesta) {
    g.fecha_deadline_propuesta =
      fechaInputDesdeIso(g.fecha_deadline) ||
      fechaInputDesdeIso(sol.fecha_deadline_propuesta) ||
      fechaInputDesdeIso(sol.fecha_limite);
  }
  if (!g.comercial_solicitante) {
    g.comercial_solicitante =
      String(g.comercial_solicitante_nombre || '').trim() ||
      String(sol.comercial_solicitante || '').trim() ||
      String(sol.solicitante_nombre || '').trim();
  }
  return g;
}
