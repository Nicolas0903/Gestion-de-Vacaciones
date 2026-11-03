const Cotizacion = require('../models/Cotizacion');
const CotizacionAdjunto = require('../models/CotizacionAdjunto');
const { Empleado } = require('../models');
const { tieneAccesoEfectivoModulo } = require('../utils/portalAcceso');
const { borradorVacio, calcularCotizacion } = require('../services/cotizacionCalculoService');
const { obtenerTipoCambioSunat } = require('../services/sunatTipoCambioService');
const { notificarCotizacionEnvioAprobacion } = require('../services/emailService');
const { esEmailEquipoComercial } = require('../constants/cotizacionEquipoComercial');

/** Comercial de equipo: solo cierre/notas y textos; montos siempre del servidor. */
function mergePropuestaEquipoComercial(servidor, cliente) {
  const s = servidor && typeof servidor === 'object' ? servidor : {};
  const c = cliente && typeof cliente === 'object' ? cliente : {};
  const out = JSON.parse(JSON.stringify(s));

  out.cierre_propuesta = c.cierre_propuesta !== undefined ? c.cierre_propuesta : s.cierre_propuesta;
  out.cierre_propuesta_at =
    c.cierre_propuesta_at !== undefined ? c.cierre_propuesta_at : s.cierre_propuesta_at;
  out.cierre_propuesta_nota =
    c.cierre_propuesta_nota !== undefined ? c.cierre_propuesta_nota : s.cierre_propuesta_nota;

  const mergeTextoEnFilas = (key, camposTexto) => {
    const sl = Array.isArray(s[key]) ? s[key] : [];
    const cl = Array.isArray(c[key]) ? c[key] : [];
    out[key] = sl.map((row, i) => {
      const patch = cl[i] || {};
      const next = { ...row };
      for (const f of camposTexto) {
        if (typeof patch[f] === 'string') next[f] = patch[f];
      }
      return next;
    });
  };
  mergeTextoEnFilas('inversion_roles', ['actividad']);
  mergeTextoEnFilas('pagos_entregables', ['descripcion', 'entregable']);
  mergeTextoEnFilas('pagos_forma', ['descripcion']);
  mergeTextoEnFilas('detalle', ['actividad']);

  return out;
}

function esAdmin(req) {
  return req.usuario?.rol_nombre === 'admin';
}

async function empleadoReq(req) {
  if (req.empleadoPortal) return req.empleadoPortal;
  return Empleado.buscarPorId(req.usuario.id);
}

/** @returns {{ ok: true, cot, modo: 'elaborador'|'comercial' } | { ok: false, status, mensaje }} */
async function accesoCotizacion(req, id) {
  const cot = await Cotizacion.buscarPorId(id);
  if (!cot) {
    return { ok: false, status: 404, mensaje: 'Cotización no encontrada' };
  }
  const empleado = await empleadoReq(req);
  const borrador = Cotizacion.enriquecerBorrador(cot.borrador_json, cot);
  const uid = req.usuario.id;

  if (esAdmin(req)) {
    return { ok: true, cot, modo: 'elaborador' };
  }

  const puedeElaborarModulo = empleado && tieneAccesoEfectivoModulo(empleado, 'cotizaciones');
  if (puedeElaborarModulo && Cotizacion.usuarioTieneAcceso(cot, borrador, uid)) {
    return { ok: true, cot, modo: 'elaborador' };
  }

  if (empleado && esEmailEquipoComercial(empleado.email)) {
    const tieneSolicitud =
      tieneAccesoEfectivoModulo(empleado, 'solicitud-cotizacion') ||
      tieneAccesoEfectivoModulo(empleado, 'cotizaciones');
    if (tieneSolicitud) {
      return { ok: true, cot, modo: 'comercial_equipo' };
    }
  }

  const esSolicitante = await Cotizacion.usuarioEsSolicitanteComercial(id, uid);
  if (esSolicitante && empleado && tieneAccesoEfectivoModulo(empleado, 'solicitud-cotizacion')) {
    return { ok: true, cot, modo: 'comercial' };
  }

  return { ok: false, status: 403, mensaje: 'Sin acceso a esta cotización' };
}

async function verificarAccesoCotizacion(req, res, id) {
  const a = await accesoCotizacion(req, id);
  if (!a.ok) {
    res.status(a.status).json({ success: false, mensaje: a.mensaje });
    return null;
  }
  req.cotizacionModoAcceso = a.modo;
  return a.cot;
}

async function verificarElaboracionCotizacion(req, res, id) {
  const a = await accesoCotizacion(req, id);
  if (!a.ok) {
    res.status(a.status).json({ success: false, mensaje: a.mensaje });
    return null;
  }
  if (a.modo !== 'elaborador') {
    res.status(403).json({
      success: false,
      mensaje: 'Solo el equipo de elaboración puede modificar esta cotización'
    });
    return null;
  }
  return a.cot;
}

exports.plantilla = (req, res) => {
  res.json({ success: true, data: calcularCotizacion(borradorVacio()) });
};

exports.listarTiposProyecto = async (req, res) => {
  try {
    const tipos = await Cotizacion.listarTiposProyecto();
    res.json({
      success: true,
      data: tipos.map(({ id, nombre }) => ({ id, nombre }))
    });
  } catch (e) {
    console.error('cotizaciones tipos:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar tipos de proyecto' });
  }
};

exports.crearTipoProyecto = async (req, res) => {
  try {
    const tipo = await Cotizacion.crearTipoProyecto(req.body?.nombre);
    res.status(201).json({ success: true, data: tipo });
  } catch (e) {
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear tipo' });
  }
};

exports.tipoCambioSunat = async (req, res) => {
  try {
    const data = await obtenerTipoCambioSunat();
    res.json({ success: true, data });
  } catch (e) {
    console.error('tipo cambio SUNAT:', e.message);
    res.status(502).json({
      success: false,
      mensaje: 'No se pudo obtener el tipo de cambio referencial SUNAT. Ingresa el valor manualmente.'
    });
  }
};

exports.listarResponsables = async (req, res) => {
  try {
    const rows = await Cotizacion.listarResponsables();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al listar responsables' });
  }
};

exports.listar = async (req, res) => {
  try {
    const empleado = await empleadoReq(req);
    const veTodas =
      esAdmin(req) || (empleado && esEmailEquipoComercial(empleado.email));
    const lista = await Cotizacion.listar({
      q: req.query.q,
      ruc: req.query.ruc,
      estado: req.query.estado,
      desde: req.query.desde,
      hasta: req.query.hasta,
      soloAccesoUsuarioId: veTodas ? null : req.usuario.id
    });
    res.json({ success: true, data: lista });
  } catch (e) {
    console.error('cotizaciones listar:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar cotizaciones' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const cot = await verificarAccesoCotizacion(req, res, req.params.id);
    if (!cot) return;
    const detalle = await Cotizacion.obtenerDetalle(req.params.id);
    res.json({
      success: true,
      data: { ...detalle, acceso_modo: req.cotizacionModoAcceso || 'elaborador' }
    });
  } catch (e) {
    console.error('cotizaciones obtener:', e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener cotización' });
  }
};

exports.crear = async (req, res) => {
  try {
    const empleado = await empleadoReq(req);
    if (!empleado || !tieneAccesoEfectivoModulo(empleado, 'cotizaciones')) {
      return res.status(403).json({ success: false, mensaje: 'Solo el equipo de elaboración puede crear cotizaciones' });
    }
    const detalle = await Cotizacion.crear(req.usuario.id, req.body);
    res.status(201).json({ success: true, data: detalle, mensaje: 'Cotización creada (v1)' });
  } catch (e) {
    console.error('cotizaciones crear:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear cotización' });
  }
};

exports.guardarBorrador = async (req, res) => {
  try {
    const id = req.params.id;
    const cot = await verificarAccesoCotizacion(req, res, id);
    if (!cot) return;

    if (req.cotizacionModoAcceso === 'comercial_equipo') {
      const detallePrev = await Cotizacion.obtenerDetalle(id);
      const propuesta = mergePropuestaEquipoComercial(
        detallePrev.borrador?.propuesta,
        req.body?.propuesta || req.body?.borrador?.propuesta
      );
      const detalle = await Cotizacion.actualizarBorrador(
        id,
        { ...detallePrev.borrador, propuesta },
        { usuarioId: null }
      );
      return res.json({
        success: true,
        data: { ...detalle, acceso_modo: 'comercial_equipo' },
        mensaje: 'Datos comerciales guardados (montos de propuesta no modificados)'
      });
    }

    if (req.cotizacionModoAcceso !== 'elaborador') {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo el equipo de elaboración puede modificar esta cotización'
      });
    }

    const body = { ...(req.body || {}) };
    if (!esAdmin(req) && body.general) {
      body.general = { ...body.general };
      delete body.general.responsable_ids;
      delete body.general.responsable_id;
    }
    const detalle = await Cotizacion.actualizarBorrador(id, body, {
      usuarioId: req.usuario.id
    });
    res.json({ success: true, data: detalle });
  } catch (e) {
    console.error('cotizaciones guardarBorrador:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al guardar borrador' });
  }
};

exports.asignarAccesoResponsables = async (req, res) => {
  try {
    if (!esAdmin(req)) {
      return res.status(403).json({ success: false, mensaje: 'Solo administradores pueden reasignar acceso' });
    }
    const ids = req.body?.responsable_ids ?? req.body?.responsables_ids;
    const detalle = await Cotizacion.asignarResponsablesAcceso(req.params.id, ids);
    res.json({
      success: true,
      data: detalle,
      mensaje: 'Acceso actualizado para esta cotización (la solicitud comercial no se modificó)'
    });
  } catch (e) {
    console.error('cotizaciones asignarAccesoResponsables:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al asignar responsables' });
  }
};

exports.publicarVersion = async (req, res) => {
  try {
    const cot = await verificarElaboracionCotizacion(req, res, req.params.id);
    if (!cot) return;
    const comentario = req.body?.comentario || '';
    const detalle = await Cotizacion.publicarVersion(req.params.id, comentario, req.usuario.id);
    res.json({ success: true, data: detalle, mensaje: 'Versión publicada' });
  } catch (e) {
    console.error('cotizaciones publicarVersion:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al publicar versión' });
  }
};

exports.verVersion = async (req, res) => {
  try {
    const cot = await verificarAccesoCotizacion(req, res, req.params.id);
    if (!cot) return;
    const version = await Cotizacion.obtenerVersion(req.params.id, req.params.versionNum);
    if (!version) {
      return res.status(404).json({ success: false, mensaje: 'Versión no encontrada' });
    }
    const snapshot = Cotizacion.enriquecerBorrador(version.snapshot_json);
    res.json({ success: true, data: { version, snapshot } });
  } catch (e) {
    console.error('cotizaciones verVersion:', e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener versión' });
  }
};

exports.restaurarVersion = async (req, res) => {
  try {
    const cot = await verificarElaboracionCotizacion(req, res, req.params.id);
    if (!cot) return;
    const detalle = await Cotizacion.restaurarVersion(
      req.params.id,
      req.params.versionNum,
      req.body?.comentario,
      req.usuario.id
    );
    res.json({ success: true, data: detalle, mensaje: 'Versión restaurada como nueva publicación' });
  } catch (e) {
    console.error('cotizaciones restaurarVersion:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al restaurar versión' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const cot = await verificarElaboracionCotizacion(req, res, req.params.id);
    if (!cot) return;
    const ok = await Cotizacion.eliminar(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Cotización no encontrada' });
    }
    res.json({ success: true, mensaje: 'Cotización eliminada' });
  } catch (e) {
    console.error('cotizaciones eliminar:', e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar cotización' });
  }
};

exports.listarAdjuntos = async (req, res) => {
  try {
    const cotizacionId = parseInt(req.params.id, 10);
    const cot = await verificarAccesoCotizacion(req, res, cotizacionId);
    if (!cot) return;
    const rows = await CotizacionAdjunto.listarPorCotizacion(cotizacionId);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('cotizaciones listarAdjuntos:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar adjuntos' });
  }
};

exports.subirAdjunto = async (req, res) => {
  try {
    const cotizacionId = parseInt(req.params.id, 10);
    const cot = await verificarAccesoCotizacion(req, res, cotizacionId);
    if (!cot) return;
    if (!req.file) {
      return res.status(400).json({ success: false, mensaje: 'No se recibió archivo' });
    }
    const row = await CotizacionAdjunto.crear(cotizacionId, {
      nombreOriginal: req.file.originalname,
      nombreArchivo: req.file.filename,
      tamano: req.file.size,
      mime: req.file.mimetype,
      comentario: req.body?.comentario || null,
      subidoPor: req.usuario.id
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error('cotizaciones subirAdjunto:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al subir adjunto' });
  }
};

exports.descargarAdjunto = async (req, res) => {
  try {
    const cotizacionId = parseInt(req.params.id, 10);
    const cot = await verificarAccesoCotizacion(req, res, cotizacionId);
    if (!cot) return;
    const adjuntoId = parseInt(req.params.adjuntoId, 10);
    const row = await CotizacionAdjunto.buscarPorId(adjuntoId, cotizacionId);
    if (!row) {
      return res.status(404).json({ success: false, mensaje: 'Adjunto no encontrado' });
    }
    const full = CotizacionAdjunto.rutaAbsoluta(cotizacionId, row.nombre_archivo);
    res.download(full, row.nombre_original);
  } catch (e) {
    console.error('cotizaciones descargarAdjunto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al descargar' });
  }
};

exports.eliminarAdjunto = async (req, res) => {
  try {
    const cotizacionId = parseInt(req.params.id, 10);
    const cot = await verificarAccesoCotizacion(req, res, cotizacionId);
    if (!cot) return;
    const adjuntoId = parseInt(req.params.adjuntoId, 10);
    const ok = await CotizacionAdjunto.eliminar(adjuntoId, cotizacionId);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Adjunto no encontrado' });
    }
    res.json({ success: true, mensaje: 'Adjunto eliminado' });
  } catch (e) {
    console.error('cotizaciones eliminarAdjunto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar adjunto' });
  }
};

exports.solicitarAprobacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const cot = await verificarElaboracionCotizacion(req, res, id);
    if (!cot) return;
    const detalleAntes = await Cotizacion.obtenerDetalle(id);
    const borrador = detalleAntes.borrador;
    borrador.general = { ...borrador.general, estado: 'en_revision' };
    const comentario = String(req.body?.comentario || '').trim();
    if (comentario) {
      borrador.general.notas_aprobacion = comentario;
    }
    const detalle = await Cotizacion.actualizarBorrador(id, borrador, { usuarioId: req.usuario.id });
    const adjuntos = await CotizacionAdjunto.listarPorCotizacion(id);
    const archivos = adjuntos.map((a) => ({
      path: CotizacionAdjunto.rutaAbsoluta(id, a.nombre_archivo),
      filename: a.nombre_original
    }));
    await notificarCotizacionEnvioAprobacion({
      cotizacion: detalle.cotizacion,
      borrador: detalle.borrador,
      enviadoPor: req.usuario,
      comentario,
      adjuntos: archivos
    }).catch(() => {});
    res.json({
      success: true,
      data: detalle,
      mensaje: 'Cotización enviada a aprobación. Se notificó a los responsables.'
    });
  } catch (e) {
    console.error('cotizaciones solicitarAprobacion:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al solicitar aprobación' });
  }
};
