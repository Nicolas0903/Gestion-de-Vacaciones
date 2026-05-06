const ControlProyecto = require('../models/ControlProyecto');

const EMAIL_VERONICA_CP =
  (process.env.CONTROL_PROYECTOS_VERONICA_EMAIL || 'veronica.gonzales@prayaga.biz').toLowerCase().trim();

const ESTADOS_PROYECTO = new Set(['finalizado', 'en_curso', 'pendiente', 'perdido']);
const REQUERIDO_POR = new Set([
  'ricardo_martinez',
  'rodrigo_loayza',
  'juan_pena',
  'magali_sevillano',
  'enrique_agapito'
]);
const PRIORIDADES = new Set(['baja', 'media', 'alta']);
const ESTADOS_ACT = new Set(['no_iniciado', 'en_progreso', 'cerrado']);
const SIT_PAGO = new Set(['pagado', 'pendiente']);

function puedeGestionProyectos(u) {
  if (!u) return false;
  if (u.rol_nombre === 'admin') return true;
  return (u.email || '').toLowerCase().trim() === EMAIL_VERONICA_CP;
}

function puedeVerActividadesGlobales(u) {
  return puedeGestionProyectos(u);
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

function sqlMissing(msg) {
  return (
    typeof msg === 'string' &&
    (msg.includes("doesn't exist") ||
      msg.includes("Unknown table 'cp_") ||
      (msg.includes('cp_proyectos') && msg.includes("doesn't exist")))
  );
}

const consultoresParaProyectos = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para cargar consultores.' });
  }
  try {
    const data = await ControlProyecto.listarConsultoresActivos();
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar consultores.' });
  }
};

const listarProyectos = async (req, res) => {
  try {
    if (!puedeGestionProyectos(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'Solo administración puede ver todos los proyectos.' });
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
      consultor_asignado_id,
      horas_asignadas,
      estado,
      detalles
    } = req.body;
    if (!empresa || !proyecto || !fecha_inicio || !fecha_fin || !consultor_asignado_id) {
      return res.status(400).json({ success: false, mensaje: 'Complete empresa, proyecto, fechas y consultor.' });
    }
    if (!ESTADOS_PROYECTO.has(estado || '')) {
      return res.status(400).json({ success: false, mensaje: 'Estado de proyecto no válido.' });
    }
    const id = await ControlProyecto.crearProyecto({
      empresa: String(empresa).trim(),
      proyecto: String(proyecto).trim(),
      fecha_inicio,
      fecha_fin,
      consultor_asignado_id: parseInt(consultor_asignado_id, 10),
      horas_asignadas: parseNum(horas_asignadas, 0),
      estado,
      detalles: detalles != null ? String(detalles) : null
    });
    const row = await ControlProyecto.obtenerProyecto(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear proyecto.' });
  }
};

const actualizarProyecto = async (req, res) => {
  if (!puedeGestionProyectos(req.usuario)) {
    return res.status(403).json({ success: false, mensaje: 'Sin permiso para editar proyectos.' });
  }
  try {
    const id = parseInt(req.params.id, 10);
    const patch = { ...req.body };
    if (patch.estado && !ESTADOS_PROYECTO.has(patch.estado)) {
      return res.status(400).json({ success: false, mensaje: 'Estado inválido.' });
    }
    const ok = await ControlProyecto.actualizarProyecto(id, patch);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'Proyecto no encontrado.' });
    const row = await ControlProyecto.obtenerProyecto(id);
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar.' });
  }
};

const listarActividades = async (req, res) => {
  try {
    const proyectoId = req.query.proyecto_id ? parseInt(req.query.proyecto_id, 10) : null;
    const verTodos = puedeVerActividadesGlobales(req.usuario);
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
    const prioridadVal = prioridad || 'media';
    if (!PRIORIDADES.has(prioridadVal)) {
      return res.status(400).json({ success: false, mensaje: 'Prioridad no válida.' });
    }
    const estadoVal = estado || 'no_iniciado';
    if (!ESTADOS_ACT.has(estadoVal)) {
      return res.status(400).json({ success: false, mensaje: 'Estado no válido.' });
    }
    const sitVal = situacion_pago || 'pendiente';
    if (!SIT_PAGO.has(sitVal)) {
      return res.status(400).json({ success: false, mensaje: 'Situación de pago no válida.' });
    }

    const pid = parseInt(proyecto_id, 10);
    const proyecto = await ControlProyecto.obtenerProyecto(pid);
    if (!proyecto) {
      return res.status(404).json({ success: false, mensaje: 'Proyecto no encontrado.' });
    }
    if (proyecto.consultor_asignado_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo puede registrar horas en proyectos en los que usted está asignado como consultor.'
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
    if (patch.fecha_hora_inicio != null) {
      patch.fecha_hora_inicio = normalizaDatetimeMysql(String(patch.fecha_hora_inicio).trim());
    }
    if (patch.fecha_hora_fin != null) {
      patch.fecha_hora_fin = normalizaDatetimeMysql(String(patch.fecha_hora_fin).trim());
    }
    if (patch.proyecto_id != null) {
      const proyecto = await ControlProyecto.obtenerProyecto(parseInt(patch.proyecto_id, 10));
      if (!proyecto) return res.status(400).json({ success: false, mensaje: 'Proyecto no existe.' });
      if (!gestor && proyecto.consultor_asignado_id !== req.usuario.id) {
        return res.status(403).json({ success: false, mensaje: 'No puede mover la actividad a un proyecto ajeno.' });
      }
    }
    if (patch.consultor_asignado_id != null && !gestor) {
      delete patch.consultor_asignado_id;
    }
    if (!gestor && patch.proyecto_id != null) {
      const proyecto = await ControlProyecto.obtenerProyecto(parseInt(patch.proyecto_id, 10));
      if (proyecto && proyecto.consultor_asignado_id !== req.usuario.id) {
        return res.status(403).json({ success: false, mensaje: 'Proyecto no asignado a usted.' });
      }
    }

    const ok = await ControlProyecto.actualizarActividad(id, patch, { permiteCambiarConsultor: gestor });
    if (!ok) return res.status(400).json({ success: false, mensaje: 'No se actualizó la actividad.' });

    /* Recalcular proyecto si cambió horas/fechas desde modelo actualizar ya recalcula */

    const row = await ControlProyecto.obtenerActividad(id);
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

module.exports = {
  puedeGestionProyectos,
  consultoresParaProyectos,
  listarProyectos,
  misProyectos,
  crearProyecto,
  actualizarProyecto,
  listarActividades,
  crearActividad,
  actualizarActividad,
  listarCostosHora,
  upsertCostoHora,
  EMAIL_VERONICA_CP,
  etiquetasCatalogo: () => ({
    estados_proyecto: [...ESTADOS_PROYECTO],
    requerido_por: [...REQUERIDO_POR],
    prioridades: [...PRIORIDADES],
    estados_actividad: [...ESTADOS_ACT],
    situacion_pago: [...SIT_PAGO]
  })
};
