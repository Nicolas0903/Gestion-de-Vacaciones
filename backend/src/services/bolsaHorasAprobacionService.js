const { pool } = require('../config/database');
const TokenActividadAprobacion = require('../models/TokenActividadAprobacion');
const ControlProyecto = require('../models/ControlProyecto');
const emailService = require('./emailService');
const {
  REQUERIDO_POR_APROBADOR_EMAIL,
  requeridoPorTieneFlujo,
  emailAprobadorPorRequeridoPor,
  esActividadHistoricaSinFlujo
} = require('../config/bolsaHorasAprobacion');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

function aprobacionEmailEsInmediato() {
  return process.env.BOLSA_HORAS_APROBACION_EMAIL_INMEDIATO === 'true';
}

async function empleadoRequiereAprobacionHoras(empleadoId) {
  const id = parseInt(String(empleadoId), 10);
  if (!Number.isFinite(id) || id <= 0) return false;
  const [rows] = await pool.execute(
    `SELECT IFNULL(requiere_aprobacion_horas, 0) AS flag FROM empleados WHERE id = ? AND activo = 1 LIMIT 1`,
    [id]
  );
  return rows[0] != null && Number(rows[0].flag) === 1;
}

async function resolverAprobadorEmpleado(requeridoPor) {
  const email = emailAprobadorPorRequeridoPor(requeridoPor);
  if (!email) return null;
  const [rows] = await pool.execute(
    `SELECT id, nombres, apellidos, email FROM empleados WHERE LOWER(TRIM(email)) = ? AND activo = 1 LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function evaluarFlujoAlCrear({ consultor_asignado_id, requerido_por }) {
  if (!requeridoPorTieneFlujo(requerido_por)) {
    return { aplica: false, estado: 'no_aplica' };
  }
  const locador = await empleadoRequiereAprobacionHoras(consultor_asignado_id);
  if (!locador) return { aplica: false, estado: 'no_aplica' };
  return { aplica: true, estado: 'pendiente' };
}

async function evaluarFlujoAlActualizar(actividadPrev, patch) {
  if (esActividadHistoricaSinFlujo(actividadPrev)) {
    return { estado: 'no_aplica', notificar: false };
  }

  const consultorId = patch.consultor_asignado_id ?? actividadPrev.consultor_asignado_id;
  const requeridoPor = patch.requerido_por ?? actividadPrev.requerido_por;
  const estPrev = actividadPrev.estado_aprobacion || 'no_aplica';

  if (estPrev === 'no_aplica') {
    const ev = await evaluarFlujoAlCrear({ consultor_asignado_id: consultorId, requerido_por: requeridoPor });
    return { estado: ev.estado, notificar: ev.aplica };
  }

  if (!requeridoPorTieneFlujo(requeridoPor)) {
    return { estado: 'no_aplica', notificar: false, limpiarAprobacion: true };
  }

  const locador = await empleadoRequiereAprobacionHoras(consultorId);
  if (!locador) {
    return { estado: 'no_aplica', notificar: false, limpiarAprobacion: true };
  }

  return { estado: 'pendiente', notificar: true, limpiarAprobacion: true };
}

async function aplicarEstadoAprobacion(actividadId, estado, { limpiarAprobacion = false } = {}) {
  if (limpiarAprobacion || estado === 'pendiente') {
    await pool.execute(
      `UPDATE cp_actividades
       SET estado_aprobacion = ?,
           aprobado_por_empleado_id = NULL,
           aprobado_at = NULL,
           rechazado_at = NULL,
           comentario_aprobacion = NULL
       WHERE id = ?`,
      [estado, actividadId]
    );
  } else {
    await pool.execute(`UPDATE cp_actividades SET estado_aprobacion = ? WHERE id = ?`, [estado, actividadId]);
  }
}

async function notificarAprobadorPendiente(actividad, { modo = 'creada' } = {}) {
  if (!actividad || actividad.estado_aprobacion !== 'pendiente') return;

  if (!aprobacionEmailEsInmediato()) {
    console.log(
      `📋 Bolsa horas aprobación #${actividad.id}: acumulada para reporte semanal (viernes) — sin correo inmediato.`
    );
    return;
  }

  const aprobador = await resolverAprobadorEmpleado(actividad.requerido_por);
  if (!aprobador?.email) {
    console.warn(`Bolsa horas aprobación: sin aprobador para requerido_por=${actividad.requerido_por}`);
    return;
  }

  await TokenActividadAprobacion.invalidarPorActividad(actividad.id);
  const tokenAprobar = await TokenActividadAprobacion.crear(actividad.id, aprobador.id, 'aprobar');
  const tokenRechazar = await TokenActividadAprobacion.crear(actividad.id, aprobador.id, 'rechazar');

  await emailService.notificarAprobacionActividadBolsaHoras({
    aprobadorEmail: aprobador.email,
    aprobadorNombre: [aprobador.nombres, aprobador.apellidos].filter(Boolean).join(' ').trim(),
    modo,
    actividadId: actividad.id,
    empresa: actividad.empresa_nombre,
    proyectoNombre: actividad.proyecto_nombre,
    consultorNombre: actividad.consultor_nombre,
    descripcionResumen: actividad.descripcion_actividad,
    horasTrabajadas: actividad.horas_trabajadas,
    urlAprobar: `${API_URL}/aprobacion-actividad-email/aprobar/${tokenAprobar}`,
    urlRechazar: `${API_URL}/aprobacion-actividad-email/rechazar/${tokenRechazar}`
  });
}

async function aprobarActividad(actividadId, aprobadorEmpleadoId) {
  const [rows] = await pool.execute(`SELECT * FROM cp_actividades WHERE id = ? LIMIT 1`, [actividadId]);
  const act = rows[0];
  if (!act) return { ok: false, mensaje: 'Actividad no encontrada.' };
  if (act.estado_aprobacion !== 'pendiente') {
    return { ok: false, mensaje: 'La actividad no está pendiente de aprobación.' };
  }

  const aprobador = await resolverAprobadorEmpleado(act.requerido_por);
  if (!aprobador || aprobador.id !== aprobadorEmpleadoId) {
    return { ok: false, mensaje: 'No está autorizado para aprobar esta actividad.' };
  }

  await pool.execute(
    `UPDATE cp_actividades
     SET estado_aprobacion = 'aprobada',
         aprobado_por_empleado_id = ?,
         aprobado_at = NOW(),
         rechazado_at = NULL,
         comentario_aprobacion = NULL
     WHERE id = ?`,
    [aprobadorEmpleadoId, actividadId]
  );
  await TokenActividadAprobacion.invalidarPorActividad(actividadId);
  return { ok: true };
}

async function rechazarActividad(actividadId, aprobadorEmpleadoId, comentario) {
  const [rows] = await pool.execute(`SELECT * FROM cp_actividades WHERE id = ? LIMIT 1`, [actividadId]);
  const act = rows[0];
  if (!act) return { ok: false, mensaje: 'Actividad no encontrada.' };
  if (act.estado_aprobacion !== 'pendiente') {
    return { ok: false, mensaje: 'La actividad no está pendiente de aprobación.' };
  }

  const aprobador = await resolverAprobadorEmpleado(act.requerido_por);
  if (!aprobador || aprobador.id !== aprobadorEmpleadoId) {
    return { ok: false, mensaje: 'No está autorizado para rechazar esta actividad.' };
  }

  const com = comentario != null ? String(comentario).trim().slice(0, 500) : null;
  await pool.execute(
    `UPDATE cp_actividades
     SET estado_aprobacion = 'rechazada',
         aprobado_por_empleado_id = NULL,
         aprobado_at = NULL,
         rechazado_at = NOW(),
         comentario_aprobacion = ?
     WHERE id = ?`,
    [com || null, actividadId]
  );
  await TokenActividadAprobacion.invalidarPorActividad(actividadId);

  const actFull = await ControlProyecto.obtenerActividad(actividadId);
  if (actFull) {
    const aprobadorNombre = [aprobador.nombres, aprobador.apellidos].filter(Boolean).join(' ').trim();
    void emailService
      .notificarRechazoActividadBolsaHorasLocador({
        locadorEmail: actFull.consultor_email,
        locadorNombre: actFull.consultor_nombre,
        aprobadorNombre,
        actividadId,
        empresa: actFull.empresa_nombre,
        proyectoNombre: actFull.proyecto_nombre,
        descripcionActividad: actFull.descripcion_actividad,
        horasTrabajadas: actFull.horas_trabajadas,
        fechaHoraInicio: actFull.fecha_hora_inicio,
        fechaHoraFin: actFull.fecha_hora_fin,
        comentarioRechazo: com
      })
      .catch((err) => console.error('Email rechazo locador bolsa horas:', err.message || err));
  }

  return { ok: true };
}

async function listarPendientesParaUsuario(usuario) {
  const email = (usuario?.email || '').trim().toLowerCase();
  if (!email) return [];

  const requeridos = Object.entries(REQUERIDO_POR_APROBADOR_EMAIL)
    .filter(([, em]) => String(em).trim().toLowerCase() === email)
    .map(([k]) => k);

  if (!requeridos.length) return [];

  const ph = requeridos.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT a.*,
            p.empresa AS empresa_nombre,
            p.proyecto AS proyecto_nombre,
            CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre
     FROM cp_actividades a
     INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
     INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
     WHERE a.estado_aprobacion = 'pendiente'
       AND a.requerido_por IN (${ph})
     ORDER BY a.updated_at DESC, a.id DESC`,
    requeridos
  );
  return rows;
}

/** Pendientes de aprobación agrupados por correo del aprobador (requerido_por). */
async function listarPendientesAgrupadosPorAprobador() {
  const [rows] = await pool.execute(
    `SELECT a.*,
            p.empresa AS empresa_nombre,
            p.proyecto AS proyecto_nombre,
            CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre
     FROM cp_actividades a
     INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
     INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
     WHERE a.estado_aprobacion = 'pendiente'
     ORDER BY a.updated_at ASC, a.id ASC`
  );

  const grupos = new Map();
  for (const row of rows) {
    if (!requeridoPorTieneFlujo(row.requerido_por)) continue;
    const email = emailAprobadorPorRequeridoPor(row.requerido_por);
    if (!email) continue;
    if (!grupos.has(email)) grupos.set(email, []);
    grupos.get(email).push(row);
  }
  return grupos;
}

module.exports = {
  aprobacionEmailEsInmediato,
  empleadoRequiereAprobacionHoras,
  resolverAprobadorEmpleado,
  evaluarFlujoAlCrear,
  evaluarFlujoAlActualizar,
  aplicarEstadoAprobacion,
  notificarAprobadorPendiente,
  aprobarActividad,
  rechazarActividad,
  listarPendientesParaUsuario,
  listarPendientesAgrupadosPorAprobador
};
