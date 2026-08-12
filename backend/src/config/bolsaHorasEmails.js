/** Rocío Picón — copia fija en reportes de bolsa de horas. */
function emailRocioPiconBolsaHoras() {
  const raw =
    process.env.BOLSA_HORAS_EMAIL_ROCIO ||
    process.env.CAJA_CHICA_EMAIL_ROCIO ||
    'rocio.picon@prayaga.biz';
  return String(raw).trim().toLowerCase();
}

/**
 * CC: Rocío Picón + consultores de las filas (sin repetir al encargado ni entre sí).
 * @param {string} encargadoEmail
 * @param {Array<{ consultor_email?: string | null }>} filas
 */
function ccReporteBolsaHorasEncargado(encargadoEmail, filas) {
  const to = String(encargadoEmail || '').trim().toLowerCase();
  const cc = new Set();
  const rocio = emailRocioPiconBolsaHoras();
  if (rocio && rocio !== to) cc.add(rocio);

  for (const f of filas || []) {
    const ce = f.consultor_email != null ? String(f.consultor_email).trim().toLowerCase() : '';
    if (ce && ce !== to && ce !== rocio) cc.add(ce);
  }
  return [...cc];
}

module.exports = { emailRocioPiconBolsaHoras, ccReporteBolsaHorasEncargado };
