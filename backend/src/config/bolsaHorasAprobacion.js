/** Flujo de aprobación de horas para locadores (desde fecha de corte). */

const REQUERIDO_POR_APROBADOR_EMAIL = {
  ricardo_martinez: 'ricardo.martinez@prayaga.biz',
  magali_sevillano: 'magali.sevillano@prayaga.biz',
  enrique_agapito: 'enrique.agapito@prayaga.biz',
  luis_aguayo: 'luis.aguayo@prayaga.biz',
  stephanie_agapito: 'stephanie.agapito@prayaga.biz',
  jeff_pena: 'jp.consultor@prayaga.biz'
};

/** Sin flujo: histórico migración u «Otros». */
const REQUERIDO_POR_SIN_FLUJO = new Set(['rodrigo_loayza', 'juan_pena', 'otros']);

const REQUERIDO_POR_LABELS = {
  ricardo_martinez: 'Ricardo Martínez',
  rodrigo_loayza: 'Rodrigo Loayza',
  juan_pena: 'Juan Peña',
  magali_sevillano: 'Magali Sevillano',
  enrique_agapito: 'Enrique Agapito',
  luis_aguayo: 'Luis Aguayo',
  stephanie_agapito: 'Stephanie Agapito',
  jeff_pena: 'Jeff Peña',
  otros: 'Otros'
};

/** Opciones visibles al registrar actividad nueva (sin históricos sin flujo). */
const REQUERIDO_POR_OPCIONES_NUEVAS = [
  'ricardo_martinez',
  'magali_sevillano',
  'enrique_agapito',
  'luis_aguayo',
  'stephanie_agapito',
  'jeff_pena',
  'otros'
];

function fechaCorteAprobacion() {
  const raw = process.env.BOLSA_HORAS_APROBACION_DESDE || '2026-08-19';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw).trim());
  if (!m) return new Date('2026-08-19T00:00:00');
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
}

function requeridoPorTieneFlujo(requeridoPor) {
  const k = requeridoPor != null ? String(requeridoPor).trim() : '';
  if (!k || REQUERIDO_POR_SIN_FLUJO.has(k)) return false;
  return Object.prototype.hasOwnProperty.call(REQUERIDO_POR_APROBADOR_EMAIL, k);
}

function emailAprobadorPorRequeridoPor(requeridoPor) {
  const k = requeridoPor != null ? String(requeridoPor).trim() : '';
  const e = REQUERIDO_POR_APROBADOR_EMAIL[k];
  return e ? String(e).trim().toLowerCase() : null;
}

function esActividadHistoricaSinFlujo(actividad) {
  if (!actividad) return true;
  const est = actividad.estado_aprobacion || 'no_aplica';
  if (est !== 'no_aplica') return false;
  const created = actividad.created_at ? new Date(actividad.created_at) : null;
  if (!created || Number.isNaN(created.getTime())) return true;
  return created < fechaCorteAprobacion();
}

module.exports = {
  REQUERIDO_POR_APROBADOR_EMAIL,
  REQUERIDO_POR_SIN_FLUJO,
  REQUERIDO_POR_LABELS,
  REQUERIDO_POR_OPCIONES_NUEVAS,
  fechaCorteAprobacion,
  requeridoPorTieneFlujo,
  emailAprobadorPorRequeridoPor,
  esActividadHistoricaSinFlujo
};
