const ControlProyecto = require('../models/ControlProyecto');
const PDFService = require('../services/pdfService');
const emailService = require('../services/emailService');

/** Emails que pueden crear/editar/eliminar proyectos además del rol admin. Por defecto: asistente@prayaga.biz */
function emailsGestionProyectosBolsaHoras() {
  const lista = process.env.CONTROL_PROYECTOS_GESTORES_EMAIL;
  if (lista && String(lista).trim()) {
    return String(lista)
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
  }
  return [
    (process.env.CONTROL_PROYECTOS_VERONICA_EMAIL || 'asistente@prayaga.biz').toLowerCase().trim()
  ];
}

const EMAIL_VERONICA_CP = emailsGestionProyectosBolsaHoras()[0] || '';

const ESTADOS_PROYECTO = new Set(['finalizado', 'en_curso', 'pendiente', 'perdido']);
const REQUERIDO_POR = new Set([
  'ricardo_martinez',
  'rodrigo_loayza',
  'juan_pena',
  'magali_sevillano',
  'enrique_agapito',
  'otros'
]);

const REQ_OTROS_MAX_LEN = 280;

function textoRequeridoPorOtrosValido(raw) {
  const t = raw != null ? String(raw).trim() : '';
  if (!t) return null;
  return t.slice(0, REQ_OTROS_MAX_LEN);
}
const PRIORIDADES = new Set(['baja', 'media', 'alta']);
const ESTADOS_ACT = new Set(['no_iniciado', 'en_progreso', 'cerrado']);
const SIT_PAGO = new Set(['pagado', 'pendiente']);

function puedeGestionProyectos(u) {
  if (!u) return false;
  if (u.rol_nombre === 'admin') return true;
  const e = (u.email || '').toLowerCase().trim();
  return emailsGestionProyectosBolsaHoras().includes(e);
}

function parseNum(v, def = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function normalizaDatetimeMysql(v) {
  if (!v || typeof v !== 'string') return v;
  const s = v.trim().replace(/\.\d{3}Z?$/, '');
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    const tm = (t || '00:00:00').slice(0, 8);
    return `${d} ${tm.length === 5 ? `${tm}:00` : tm}`.slice(0, 19);
  }
  return s.slice(0, 19);
}

function nombreUsuarioPortal(u) {
  if (!u) return '';
  const n = [u.nombres, u.apellidos].filter(Boolean).join(' ').trim();
  return n || u.email || '';
}

/** Notifica por correo al encargado del proyecto (si existe y no es quien ejecutó la acción). */
async function intentarCorreoEncargadoPorActividad({ proyecto, actividad, modo, usuarioQueActua }) {
  try {
    if (!proyecto || !actividad || !usuarioQueActua?.id) return;
    const encId = proyecto.encargado_empleado_id != null ? parseInt(String(proyecto.encargado_empleado_id), 10) : NaN;
    if (!Number.isFinite(encId) || encId < 1) return;
    if (encId === usuarioQueActua.id) return;
    const mail = proyecto.encargado_email;
    if (!mail || !String(mail).trim()) return;
    const nombreEnc = proyecto.encargado_nombre || 'Encargado';
    await emailService.notificarActividadBolsaHorasEncargado({
      encargadoEmail: mail,
      encargadoNombre: nombreEnc,
      modo,
      empresa: proyecto.empresa || '',
      proyectoNombre: proyecto.proyecto || '',
      actividadId: actividad.id,
      descripcionResumen: actividad.descripcion_actividad || '',
      horasTrabajadas: actividad.horas_trabajadas,
      consultorNombre: actividad.consultor_nombre || '—',
      usuarioNombre: nombreUsuarioPortal(usuarioQueActua),
      usuarioEmail: usuarioQueActua.email || ''
    });
  } catch (e) {
    console.warn('intentarCorreoEncargadoPorActividad:', e.message);
  }
}

function parseConsultoresEmpleadoIds(body) {
  const raw = body.consultores_empleado_ids;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))];
  }
  if (raw != null && raw !== '') {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? [n] : [];
  }
  return [];
}

function sqlMissing(msg) {
  return (
    typeof msg === 'string' &&
    (msg.includes("doesn't exist") ||
      msg.includes("Unknown table 'cp_") ||
      (msg.includes('cp_proyectos') && msg.includes("doesn't exist")) ||
      (msg.includes('cp_proyecto_consultores') && msg.includes("doesn't exist")))
  );
}

function sqlMigracionEncargadoCp(msg) {
  const m = typeof msg === 'string' ? msg : '';
  return m.includes('encargado_empleado_id') && (m.includes('Unknown column') || m.includes('does not exist'));
}

/** YYYY-MM-DD */
function parseFechaSoloDia(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function defaultRangoFechaFinUltimosNoventa() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 89);
  const p = (d) => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };
  return { desde: p(desde), hasta: p(hasta) };
}

/** Mismos filtros que `reporteActividadesCp` (`YYYY-MM-DD` / proyecto / empresa). */
function parseQueryReporteActividades(req) {
  let desde = parseFechaSoloDia(req.query.fecha_fin_desde);
  let hasta = parseFechaSoloDia(req.query.fecha_fin_hasta);
  if (!desde || !hasta) {
    const def = defaultRangoFechaFinUltimosNoventa();
    desde = desde || def.desde;
    hasta = hasta || def.hasta;
  }
  if (desde > hasta) {
    const t = desde;
    desde = hasta;
    hasta = t;
  }

  const rawPid = req.query.proyecto_id;
  const proyectoIdParsed =
    rawPid !== undefined && rawPid !== null && String(rawPid).trim() !== ''
      ? parseInt(String(rawPid), 10)
      : null;
  const proyectoId =
    Number.isFinite(proyectoIdParsed) && proyectoIdParsed > 0 ? proyectoIdParsed : null;

  const empresaTrim = req.query.empresa != null ? String(req.query.empresa).trim() : '';

  const rawCid = req.query.consultor_empleado_id;
  const consultorParsed =
    rawCid !== undefined && rawCid !== null && String(rawCid).trim() !== ''
      ? parseInt(String(rawCid), 10)
      : null;
  const consultorEmpleadoId =
    Number.isFinite(consultorParsed) && consultorParsed > 0 ? consultorParsed : null;

  return { desde, hasta, proyectoId, empresaTrim, consultorEmpleadoId };
}

function formatoFechaReporteDdMmYyyy(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd.slice(0, 10);
}

const consultoresParaProyectos = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para cargar consultores.' });
  }
  try {
    const raw = req.query.proyecto_id;
    const proyectoId =
      raw !== undefined && raw !== null && String(raw).trim() !== ''
        ? parseInt(String(raw), 10)
        : null;
    const pid = Number.isFinite(proyectoId) && proyectoId > 0 ? proyectoId : null;
    const data = await ControlProyecto.listarConsultoresParaSelector(pid);
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar consultores.' });
  }
};

const listarProyectos = async (req, res) => {
  try {
    if (!puedeGestionProyectos(req.usuario)) {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo el administrador o la cuenta corporativa autorizada pueden ver todos los proyectos.'
      });
    }
    const rows = await ControlProyecto.listarProyectosTodos();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear las tablas de Control de Proyectos en la base de datos. Ejecuta backend/sql/control_proyectos.sql'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al listar proyectos.' });
  }
};

const misProyectos = async (req, res) => {
  try {
    const rows = await ControlProyecto.listarProyectosPorConsultor(req.usuario.id);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear las tablas de Control de Proyectos en la base de datos. Ejecuta backend/sql/control_proyectos.sql'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al listar proyectos asignados.' });
  }
};

const crearProyecto = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para crear proyectos.' });
  }
  try {
    const {
      empresa,
      proyecto,
      fecha_inicio,
      fecha_fin,
      horas_asignadas,
      estado,
      detalles,
      encargado_empleado_id: rawEncargado
    } = req.body;
    const consultoresIds = parseConsultoresEmpleadoIds(req.body);
    const encargadoParsed = parseInt(rawEncargado != null ? String(rawEncargado) : '', 10);
    if (!empresa || !proyecto || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, mensaje: 'Complete empresa, proyecto y fechas.' });
    }
    if (!consultoresIds.length) {
      return res
        .status(400)
        .json({ success: false, mensaje: 'Seleccione al menos un consultor asignado (del portal).' });
    }
    if (!Number.isFinite(encargadoParsed) || encargadoParsed < 1) {
      return res.status(400).json({
        success: false,
        mensaje: 'Seleccione el encargado del proyecto (recibirá avisos por correo ante cambios en el registro de horas).'
      });
    }
    if (!ESTADOS_PROYECTO.has(estado || '')) {
      return res.status(400).json({ success: false, mensaje: 'Estado de proyecto no válido.' });
    }
    const id = await ControlProyecto.crearProyectoConConsultores(
      {
        empresa: String(empresa).trim(),
        proyecto: String(proyecto).trim(),
        fecha_inicio,
        fecha_fin,
        horas_asignadas: parseNum(horas_asignadas, 0),
        estado,
        detalles: detalles != null ? String(detalles) : null,
        encargado_empleado_id: encargadoParsed
      },
      consultoresIds
    );
    const row = await ControlProyecto.obtenerProyecto(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    const diag = `${e.sqlMessage || ''} ${e.message || ''}`;
    if (sqlMigracionEncargadoCp(diag)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta la columna «encargado» en proyectos de bolsa de horas. Ejecute backend/sql/20260507_cp_proyectos_encargado.sql en la base de datos.'
      });
    }
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear proyecto.' });
  }
};

const actualizarProyecto = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para editar proyectos.' });
  }
  try {
    const id = parseInt(req.params.id, 10);
    const consultoresIds =
      req.body.consultores_empleado_ids !== undefined ? parseConsultoresEmpleadoIds(req.body) : null;
    const patch = { ...req.body };
    delete patch.consultores_empleado_ids;
    if (patch.encargado_empleado_id !== undefined) {
      if (patch.encargado_empleado_id === '' || patch.encargado_empleado_id === null) {
        return res.status(400).json({
          success: false,
          mensaje: 'Seleccione el encargado del proyecto (recibirá avisos por correo ante cambios en el registro de horas).'
        });
      }
      const enc = parseInt(String(patch.encargado_empleado_id), 10);
      patch.encargado_empleado_id = enc;
      if (!Number.isFinite(enc) || enc < 1) {
        return res.status(400).json({
          success: false,
          mensaje: 'El encargado del proyecto debe ser un empleado activo válido.'
        });
      }
    }
    if (patch.estado && !ESTADOS_PROYECTO.has(patch.estado)) {
      return res.status(400).json({ success: false, mensaje: 'Estado inválido.' });
    }
    const ok = await ControlProyecto.actualizarProyectoYConsultores(id, patch, consultoresIds);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'Proyecto no encontrado.' });
    const row = await ControlProyecto.obtenerProyecto(id);
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    const diag = `${e.sqlMessage || ''} ${e.message || ''}`;
    if (sqlMigracionEncargadoCp(diag)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta la columna «encargado» en proyectos de bolsa de horas. Ejecute backend/sql/20260507_cp_proyectos_encargado.sql en la base de datos.'
      });
    }
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar.' });
  }
};

const eliminarProyecto = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para eliminar proyectos.' });
  }
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, mensaje: 'ID de proyecto no válido.' });
    }
    const ok = await ControlProyecto.eliminarProyecto(id);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Proyecto no encontrado.' });
    }
    res.json({ success: true, mensaje: 'Proyecto eliminado.' });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear las tablas de Control de Proyectos en la base de datos. Ejecuta backend/sql/control_proyectos.sql'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al eliminar el proyecto.' });
  }
};

const listarActividades = async (req, res) => {
  try {
    const proyectoId = req.query.proyecto_id ? parseInt(req.query.proyecto_id, 10) : null;
    const verTodos = req.usuario.rol_nombre === 'admin';
    const rows = await ControlProyecto.listarActividades({
      empleadoId: req.usuario.id,
      verTodos,
      proyectoId: proyectoId || null
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear las tablas de Control de Proyectos en la base de datos. Ejecuta backend/sql/control_proyectos.sql'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al listar actividades.' });
  }
};

const crearActividad = async (req, res) => {
  try {
    const {
      proyecto_id,
      requerido_por,
      requerido_por_otros: rpoRaw,
      descripcion_actividad,
      prioridad,
      fecha_hora_inicio: fhiRaw,
      fecha_hora_fin: fhfRaw,
      estado,
      comentarios,
      situacion_pago,
      horas_trabajadas
    } = req.body;

    const fecha_hora_inicio = normalizaDatetimeMysql(String(fhiRaw || '').trim());
    const fecha_hora_fin = normalizaDatetimeMysql(String(fhfRaw || '').trim());

    if (!proyecto_id || !requerido_por || !descripcion_actividad || !fecha_hora_inicio || !fecha_hora_fin) {
      return res.status(400).json({ success: false, mensaje: 'Complete proyecto, solicitante, descripción y fechas.' });
    }
    if (!REQUERIDO_POR.has(requerido_por)) {
      return res.status(400).json({ success: false, mensaje: 'Valor de «Requerido por» no válido.' });
    }
    let requerido_por_otros = null;
    if (requerido_por === 'otros') {
      requerido_por_otros = textoRequeridoPorOtrosValido(rpoRaw);
      if (!requerido_por_otros) {
        return res
          .status(400)
          .json({ success: false, mensaje: 'Indique el nombre cuando elige «Otros».' });
      }
    }
    const prioridadVal = prioridad || 'media';
    if (!PRIORIDADES.has(prioridadVal)) {
      return res.status(400).json({ success: false, mensaje: 'Prioridad no válida.' });
    }
    const estadoVal = estado || 'no_iniciado';
    if (!ESTADOS_ACT.has(estadoVal)) {
      return res.status(400).json({ success: false, mensaje: 'Estado no válido.' });
    }
    const esAdminCp = req.usuario.rol_nombre === 'admin';
    let sitVal = 'pendiente';
    if (esAdminCp) {
      const sitIn = situacion_pago || 'pendiente';
      if (!SIT_PAGO.has(sitIn)) {
        return res.status(400).json({ success: false, mensaje: 'Situación de pago no válida.' });
      }
      sitVal = sitIn;
    }

    const pid = parseInt(proyecto_id, 10);
    const proyecto = await ControlProyecto.obtenerProyecto(pid);
    if (!proyecto) {
      return res.status(404).json({ success: false, mensaje: 'Proyecto no encontrado.' });
    }
    const asignado = await ControlProyecto.empleadoAsignadoAProyecto(pid, req.usuario.id);
    if (!asignado) {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo puede registrar horas en proyectos en los que usted está entre los consultores asignados.'
      });
    }

    const consultor_asignado_id = req.usuario.id;

    let horasCalculadasOpcional;
    if (horas_trabajadas !== undefined && horas_trabajadas !== null && String(horas_trabajadas).trim() !== '') {
      const h = Number(horas_trabajadas);
      if (!Number.isFinite(h) || h < 0) {
        return res.status(400).json({ success: false, mensaje: 'Horas trabajadas no válidas.' });
      }
      horasCalculadasOpcional = h;
    }

    const id = await ControlProyecto.crearActividad({
      proyecto_id: pid,
      requerido_por,
      requerido_por_otros,
      consultor_asignado_id,
      descripcion_actividad: String(descripcion_actividad).trim(),
      prioridad: prioridadVal,
      fecha_hora_inicio,
      fecha_hora_fin,
      estado: estadoVal,
      comentarios: comentarios != null ? String(comentarios) : null,
      situacion_pago: sitVal,
      horas_trabajadas: horasCalculadasOpcional
    });
    const row = await ControlProyecto.obtenerActividad(id);
    const proyectoCompleto = await ControlProyecto.obtenerProyecto(pid);
    void intentarCorreoEncargadoPorActividad({
      proyecto: proyectoCompleto,
      actividad: row,
      modo: 'creada',
      usuarioQueActua: req.usuario
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al registrar actividad.' });
  }
};

const actualizarActividad = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const prev = await ControlProyecto.obtenerActividad(id);
    if (!prev) return res.status(404).json({ success: false, mensaje: 'Actividad no encontrada.' });

    const soyPropietario = prev.consultor_asignado_id === req.usuario.id;
    const gestor = puedeGestionProyectos(req.usuario);
    if (!soyPropietario && !gestor) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso para editar esta actividad.' });
    }

    const patch = { ...req.body };

    const mergedReqRaw =
      patch.requerido_por !== undefined && patch.requerido_por !== null ? String(patch.requerido_por).trim() : null;
    const mergedReq = mergedReqRaw !== null && mergedReqRaw !== '' ? mergedReqRaw : prev.requerido_por;
    if (!REQUERIDO_POR.has(mergedReq)) {
      return res.status(400).json({ success: false, mensaje: 'Valor de «Requerido por» no válido.' });
    }
    if (mergedReq === 'otros') {
      const rawOtros =
        patch.requerido_por_otros !== undefined ? patch.requerido_por_otros : prev.requerido_por_otros;
      const t = textoRequeridoPorOtrosValido(rawOtros);
      if (!t) {
        return res
          .status(400)
          .json({ success: false, mensaje: 'Indique el nombre cuando elige «Otros».' });
      }
      patch.requerido_por = mergedReq;
      patch.requerido_por_otros = t;
    } else {
      patch.requerido_por = mergedReq;
      patch.requerido_por_otros = null;
    }

    if (patch.fecha_hora_inicio != null) {
      patch.fecha_hora_inicio = normalizaDatetimeMysql(String(patch.fecha_hora_inicio).trim());
    }
    if (patch.fecha_hora_fin != null) {
      patch.fecha_hora_fin = normalizaDatetimeMysql(String(patch.fecha_hora_fin).trim());
    }
    if (patch.proyecto_id != null) {
      const proyecto = await ControlProyecto.obtenerProyecto(parseInt(patch.proyecto_id, 10));
      if (!proyecto) return res.status(400).json({ success: false, mensaje: 'Proyecto no existe.' });
      if (!gestor) {
        const okAsig = await ControlProyecto.empleadoAsignadoAProyecto(proyecto.id, req.usuario.id);
        if (!okAsig) {
          return res.status(403).json({ success: false, mensaje: 'No puede mover la actividad a un proyecto ajeno.' });
        }
      }
    }
    if (patch.consultor_asignado_id != null && !gestor) {
      delete patch.consultor_asignado_id;
    }

    const esAdminCp = req.usuario.rol_nombre === 'admin';
    if (esAdminCp) {
      if (patch.situacion_pago !== undefined && !SIT_PAGO.has(patch.situacion_pago)) {
        return res.status(400).json({ success: false, mensaje: 'Situación de pago no válida.' });
      }
    } else {
      delete patch.situacion_pago;
    }

    const ok = await ControlProyecto.actualizarActividad(id, patch, { permiteCambiarConsultor: gestor });
    if (!ok) return res.status(400).json({ success: false, mensaje: 'No se actualizó la actividad.' });

    /* Recalcular proyecto si cambió horas/fechas desde modelo actualizar ya recalcula */

    const row = await ControlProyecto.obtenerActividad(id);
    const proyectoCompleto = await ControlProyecto.obtenerProyecto(row.proyecto_id);
    void intentarCorreoEncargadoPorActividad({
      proyecto: proyectoCompleto,
      actividad: row,
      modo: 'actualizada',
      usuarioQueActua: req.usuario
    });
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar actividad.' });
  }
};

const listarCostosHora = async (req, res) => {
  try {
    const rows = await ControlProyecto.listarCostosHora();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar costos por hora.' });
  }
};

const upsertCostoHora = async (req, res) => {
  try {
    const empleadoId = parseInt(req.params.empleadoId, 10);
    const costo = parseNum(req.body.costo_por_hora, NaN);
    if (!empleadoId || Number.isNaN(costo) || costo < 0) {
      return res.status(400).json({ success: false, mensaje: 'Empleado y costo válido requeridos.' });
    }
    const row = await ControlProyecto.upsertCostoHora(empleadoId, costo);
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al guardar costo.' });
  }
};

async function responderReporteCp(req, res, modo) {
  try {
    const verTodo = puedeGestionProyectos(req.usuario);
    const empleadoId = req.usuario.id;
    const data =
      modo === 'proyectos'
        ? await ControlProyecto.reporteProyectosVistaBi({ verTodo, empleadoId })
        : await ControlProyecto.reporteDashboard({ verTodo, empleadoId });
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear o actualizar las tablas de Control de Proyectos (incl. cp_proyecto_consultores). Ver backend/sql/'
      });
    }
    res.status(500).json({
      success: false,
      mensaje: modo === 'proyectos' ? 'Error al generar el reporte de proyectos.' : 'Error al generar el reporte.'
    });
  }
}

const reporteActividadesCp = async (req, res) => {
  try {
    const { desde, hasta, proyectoId: proyectoIdFinal, empresaTrim, consultorEmpleadoId } =
      parseQueryReporteActividades(req);

    const verTodo = puedeGestionProyectos(req.usuario);
    const consultorFiltrado = verTodo ? consultorEmpleadoId : null;
    const data = await ControlProyecto.reporteActividadesVistaBi({
      verTodo,
      empleadoId: req.usuario.id,
      proyectoId: proyectoIdFinal,
      empresa: empresaTrim === '' ? null : empresaTrim,
      fechaFinDesde: desde,
      fechaFinHasta: hasta,
      consultorEmpleadoId: consultorFiltrado
    });
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear o actualizar las tablas de Control de Proyectos (incl. cp_proyecto_consultores). Ver backend/sql/'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al generar el reporte de actividades.' });
  }
};

const reporteActividadesPdfCp = async (req, res) => {
  try {
    const { desde, hasta, proyectoId, empresaTrim, consultorEmpleadoId } =
      parseQueryReporteActividades(req);

    const verTodo = puedeGestionProyectos(req.usuario);
    const consultorFiltrado = verTodo ? consultorEmpleadoId : null;
    const data = await ControlProyecto.reporteActividadesVistaBi({
      verTodo,
      empleadoId: req.usuario.id,
      proyectoId,
      empresa: empresaTrim === '' ? null : empresaTrim,
      fechaFinDesde: desde,
      fechaFinHasta: hasta,
      consultorEmpleadoId: consultorFiltrado
    });

    let proyectoFiltroLabel = 'Todas';
    if (proyectoId) {
      const p = (data.proyectos_opciones || []).find((x) => Number(x.id) === proyectoId);
      proyectoFiltroLabel = p ? `${p.empresa} — ${p.proyecto}` : `Proyecto id ${proyectoId}`;
    }
    const empresaFiltroLabel = empresaTrim === '' ? 'Todas' : empresaTrim;
    const consultorFiltroLabel =
      data?.filtros?.consultor_empleado_id != null ? data.filtros.consultor_nombre || `Id ${data.filtros.consultor_empleado_id}` : 'Todos';

    const u = req.usuario;
    const generadoPorNombre =
      [u.nombres, u.apellidos].filter(Boolean).join(' ').trim() || u.email || '—';

    const alcanceLinea =
      data.alcance === 'todos'
        ? 'Alcance administración.'
        : 'Alcance solo actividades donde usted es el consultor asignado.';

    const acts = Array.isArray(data.actividades) ? data.actividades : [];
    const totalHorasLista = Math.round(acts.reduce((s, r) => s + (Number(r.horas_trabajadas) || 0), 0) * 100) / 100;

    const pdfBuffer = await PDFService.generarReporteActividadesControlProyectos({
      generadoPorNombre,
      proyectoFiltroLabel,
      empresaFiltroLabel,
      consultorFiltroLabel,
      fechaFinDesdeLabel: formatoFechaReporteDdMmYyyy(desde),
      fechaFinHastaLabel: formatoFechaReporteDdMmYyyy(hasta),
      alcanceLinea,
      kpis: data.kpis,
      actividades: acts,
      totalHorasLista
    });

    const safeName = `reporte-actividades-cp_${desde}_${hasta}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    if (sqlMissing(e.sqlMessage || e.message)) {
      return res.status(503).json({
        success: false,
        mensaje:
          'Falta crear o actualizar las tablas de Control de Proyectos (incl. cp_proyecto_consultores). Ver backend/sql/'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al generar el PDF del reporte de actividades.' });
  }
};

/** Query `?vista=proyectos` proyectos BI; `?vista=actividades` tabla de actividades por fecha de fin. */
const reporteDashboard = async (req, res) => {
  const vista = String(req.query.vista || '').trim().toLowerCase();
  if (vista === 'proyectos') {
    return responderReporteCp(req, res, 'proyectos');
  }
  if (vista === 'actividades') {
    return reporteActividadesCp(req, res);
  }
  return responderReporteCp(req, res, 'resumen');
};

/** Alias explícito (misma respuesta que /reporte?vista=proyectos). */
const reporteProyectosVistaBi = async (req, res) => responderReporteCp(req, res, 'proyectos');

module.exports = {
  puedeGestionProyectos,
  consultoresParaProyectos,
  listarProyectos,
  misProyectos,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  listarActividades,
  crearActividad,
  actualizarActividad,
  listarCostosHora,
  upsertCostoHora,
  reporteDashboard,
  reporteProyectosVistaBi,
  reporteActividadesPdfCp,
  EMAIL_VERONICA_CP,
  emailsGestionProyectosBolsaHoras,
  etiquetasCatalogo: () => ({
    estados_proyecto: [...ESTADOS_PROYECTO],
    requerido_por: [...REQUERIDO_POR],
    prioridades: [...PRIORIDADES],
    estados_actividad: [...ESTADOS_ACT],
    situacion_pago: [...SIT_PAGO]
  })
};
