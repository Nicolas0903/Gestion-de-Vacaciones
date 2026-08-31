const { pool } = require('../config/database');
const {
  Empleado,
  SolicitudVacaciones,
  PermisoDescanso,
  SolicitudRegistro,
  Reembolso,
  RendicionPresupuesto,
  BoletaPago
} = require('../models');
const bolsaHorasAprobacionService = require('./bolsaHorasAprobacionService');
const { getPortalBaseUrl } = require('../config/frontendPublic');

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function fmtFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return String(f).slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function crearCategoria(clave, etiqueta, items, urlPath, formatearItem, maxVisibles = 5) {
  if (!items?.length) return null;
  const visibles = items.slice(0, maxVisibles).map(formatearItem);
  const resto = Math.max(0, items.length - visibles.length);
  return {
    clave,
    etiqueta,
    cantidad: items.length,
    items: visibles,
    resto,
    url: `${getPortalBaseUrl()}${urlPath}`
  };
}

async function listarActividadesRechazadasConsultor(empleadoId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.descripcion_actividad, a.fecha_hora_inicio,
            p.proyecto AS proyecto_nombre
     FROM cp_actividades a
     INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
     WHERE a.consultor_asignado_id = ?
       AND a.estado_aprobacion = 'rechazada'
     ORDER BY a.rechazado_at DESC, a.id DESC`,
    [empleadoId]
  );
  return rows;
}

async function listarReembolsosObservados(empleadoId) {
  const [rows] = await pool.execute(
    `SELECT id, concepto, monto, created_at
     FROM solicitudes_reembolso
     WHERE empleado_id = ? AND estado = 'observado'
     ORDER BY created_at DESC`,
    [empleadoId]
  );
  return rows;
}

async function listarRendicionesObservadas(empleadoId) {
  const [rows] = await pool.execute(
    `SELECT id, concepto, monto, created_at
     FROM rendiciones_presupuesto
     WHERE empleado_id = ? AND estado = 'observado'
     ORDER BY created_at DESC`,
    [empleadoId]
  );
  return rows;
}

function codigoReembolso(row) {
  const y = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `RMB-${y}-${String(row.id).padStart(5, '0')}`;
}

function codigoRendicion(row) {
  const y = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `RND-${y}-${String(row.id).padStart(5, '0')}`;
}

/**
 * Resumen detallado de pendientes accionables para un empleado.
 * Usado por el correo semanal y por el endpoint de prueba admin.
 */
async function obtenerPendientesDetallados(usuario, contexto = {}) {
  const rol = usuario?.rol_nombre;
  const userId = usuario?.id;
  const categorias = [];

  const aprobadorReembolsosId = contexto.aprobadorReembolsosId ?? null;
  const idsAprobadoresRendicion = contexto.idsAprobadoresRendicion ?? null;

  const esAprobadorReembolsos =
    rol === 'admin' || (aprobadorReembolsosId != null && userId === aprobadorReembolsosId);

  let esAprobadorRendicion = rol === 'admin';
  if (!esAprobadorRendicion && idsAprobadoresRendicion instanceof Set) {
    esAprobadorRendicion = idsAprobadoresRendicion.has(userId);
  }

  const bolsaApr = await bolsaHorasAprobacionService.listarPendientesParaUsuario(usuario);
  const catBolsaApr = crearCategoria(
    'bolsa_aprobacion',
    'Actividades de bolsa de horas por aprobar',
    bolsaApr,
    '/control-proyectos',
    (a) =>
      `#${a.id} · ${a.proyecto_nombre || '—'} · ${a.consultor_nombre || '—'} · ${fmtFecha(a.fecha_hora_inicio)}`
  );
  if (catBolsaApr) categorias.push(catBolsaApr);

  const bolsaRech = await listarActividadesRechazadasConsultor(userId);
  const catBolsaRech = crearCategoria(
    'bolsa_rechazada',
    'Actividades de bolsa de horas rechazadas (corregir)',
    bolsaRech,
    '/control-proyectos',
    (a) => `#${a.id} · ${a.proyecto_nombre || '—'} · ${fmtFecha(a.fecha_hora_inicio)}`
  );
  if (catBolsaRech) categorias.push(catBolsaRech);

  const boletas = await BoletaPago.listarTodas({ empleado_id: userId, firmada: false });
  const catBoletas = crearCategoria(
    'boletas',
    'Boletas de pago sin firmar',
    boletas,
    '/boletas',
    (b) => `${MESES[(b.mes || 1) - 1] || b.mes} ${b.anio}`
  );
  if (catBoletas) categorias.push(catBoletas);

  const reembObs = await listarReembolsosObservados(userId);
  const catReembObs = crearCategoria(
    'reembolsos_observados',
    'Reintegros observados (reenviar)',
    reembObs,
    '/reembolsos',
    (r) => `${codigoReembolso(r)} · ${String(r.concepto || '').trim().slice(0, 80) || 'Sin concepto'}`
  );
  if (catReembObs) categorias.push(catReembObs);

  const rendObs = await listarRendicionesObservadas(userId);
  const catRendObs = crearCategoria(
    'rendiciones_observadas',
    'Rendiciones observadas (reenviar)',
    rendObs,
    '/rendicion-presupuesto',
    (r) => `${codigoRendicion(r)} · ${String(r.concepto || '').trim().slice(0, 80) || 'Sin concepto'}`
  );
  if (catRendObs) categorias.push(catRendObs);

  if (rol === 'admin') {
    const [vacaciones, permisos, reembolsos, registros] = await Promise.all([
      SolicitudVacaciones.listarTodasPendientes().catch(() => []),
      PermisoDescanso.listarPendientes().catch(() => []),
      Reembolso.listarPendientes().catch(() => []),
      SolicitudRegistro.listarPendientes().catch(() => [])
    ]);

    const catVac = crearCategoria(
      'vacaciones',
      'Solicitudes de vacaciones por aprobar',
      vacaciones,
      '/vacaciones/aprobaciones',
      (s) =>
        `${s.nombres} ${s.apellidos} · ${fmtFecha(s.fecha_inicio_vacaciones)} – ${fmtFecha(s.fecha_fin_vacaciones)}`
    );
    if (catVac) categorias.push(catVac);

    const catPerm = crearCategoria(
      'permisos',
      'Permisos / descansos por revisar',
      permisos,
      '/permisos/gestion',
      (p) =>
        `${p.empleado_nombres} ${p.empleado_apellidos} · ${fmtFecha(p.fecha_inicio)} · ${p.tipo || 'permiso'}`
    );
    if (catPerm) categorias.push(catPerm);

    const catReemb = crearCategoria(
      'reembolsos',
      'Reintegros pendientes de aprobación',
      reembolsos,
      '/reembolsos/gestion',
      (r) =>
        `${codigoReembolso(r)} · ${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim()
    );
    if (catReemb) categorias.push(catReemb);

    const catReg = crearCategoria(
      'registros',
      'Solicitudes de registro de usuarios',
      registros,
      '/admin/solicitudes-registro',
      (s) => `${s.nombres || ''} ${s.apellidos || ''} · ${s.email || '—'}`.trim()
    );
    if (catReg) categorias.push(catReg);
  } else if (rol === 'contadora') {
    const promesas = [
      SolicitudVacaciones.listarPendientesAprobacion(userId, 'contadora').catch(() => []),
      PermisoDescanso.listarPendientes().catch(() => [])
    ];
    if (esAprobadorReembolsos) {
      promesas.push(Reembolso.listarPendientes().catch(() => []));
    } else {
      promesas.push(Promise.resolve([]));
    }
    const [vacaciones, permisos, reembolsos] = await Promise.all(promesas);

    const catVac = crearCategoria(
      'vacaciones',
      'Vacaciones esperando tu visto como contadora',
      vacaciones,
      '/vacaciones/aprobaciones',
      (s) =>
        `${s.nombres} ${s.apellidos} · ${fmtFecha(s.fecha_inicio_vacaciones)} – ${fmtFecha(s.fecha_fin_vacaciones)}`
    );
    if (catVac) categorias.push(catVac);

    const catPerm = crearCategoria(
      'permisos',
      'Permisos / descansos por revisar',
      permisos,
      '/permisos/gestion',
      (p) =>
        `${p.empleado_nombres} ${p.empleado_apellidos} · ${fmtFecha(p.fecha_inicio)} · ${p.tipo || 'permiso'}`
    );
    if (catPerm) categorias.push(catPerm);

    if (esAprobadorReembolsos) {
      const catReemb = crearCategoria(
        'reembolsos',
        'Reintegros pendientes de aprobación',
        reembolsos,
        '/reembolsos/gestion',
        (r) =>
          `${codigoReembolso(r)} · ${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim()
      );
      if (catReemb) categorias.push(catReemb);
    }
  } else if (rol === 'jefe_operaciones') {
    const promesas = [
      SolicitudVacaciones.listarPendientesAprobacion(userId, 'jefe').catch(() => [])
    ];
    if (esAprobadorReembolsos) {
      promesas.push(Reembolso.listarPendientes().catch(() => []));
    } else {
      promesas.push(Promise.resolve([]));
    }
    const [vacaciones, reembolsos] = await Promise.all(promesas);

    const catVac = crearCategoria(
      'vacaciones',
      'Vacaciones esperando tu aprobación como jefe',
      vacaciones,
      '/vacaciones/aprobaciones',
      (s) =>
        `${s.nombres} ${s.apellidos} · ${fmtFecha(s.fecha_inicio_vacaciones)} – ${fmtFecha(s.fecha_fin_vacaciones)}`
    );
    if (catVac) categorias.push(catVac);

    if (esAprobadorReembolsos) {
      const catReemb = crearCategoria(
        'reembolsos',
        'Reintegros pendientes de aprobación',
        reembolsos,
        '/reembolsos/gestion',
        (r) =>
          `${codigoReembolso(r)} · ${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim()
      );
      if (catReemb) categorias.push(catReemb);
    }
  } else if (esAprobadorReembolsos) {
    const reembolsos = await Reembolso.listarPendientes().catch(() => []);
    const catReemb = crearCategoria(
      'reembolsos',
      'Reintegros pendientes de aprobación',
      reembolsos,
      '/reembolsos/gestion',
      (r) =>
        `${codigoReembolso(r)} · ${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim()
    );
    if (catReemb) categorias.push(catReemb);
  }

  if (esAprobadorRendicion) {
    const rendiciones = await RendicionPresupuesto.listarPendientes().catch(() => []);
    const catRend = crearCategoria(
      'rendiciones',
      'Rendiciones de presupuesto por aprobar',
      rendiciones,
      '/rendicion-presupuesto/gestion',
      (r) =>
        `${codigoRendicion(r)} · ${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim()
    );
    if (catRend) categorias.push(catRend);
  }

  const total = categorias.reduce((acc, c) => acc + (c.cantidad || 0), 0);
  const primerNombre = String(usuario?.nombres || '').trim().split(/\s+/)[0] || 'Equipo';

  return { total, categorias, primerNombre };
}

async function cargarContextoGlobal() {
  let aprobadorReembolsosId = null;
  try {
    const aprobador = await Empleado.obtenerAprobadorReembolsos();
    aprobadorReembolsosId = aprobador?.id || null;
  } catch (_) {
    /* ignore */
  }

  let idsAprobadoresRendicion = new Set();
  try {
    const aprobadores = await Empleado.obtenerAprobadoresRendicion();
    idsAprobadoresRendicion = new Set(aprobadores.map((a) => a.id));
  } catch (_) {
    /* ignore */
  }

  return { aprobadorReembolsosId, idsAprobadoresRendicion };
}

module.exports = {
  obtenerPendientesDetallados,
  cargarContextoGlobal
};
