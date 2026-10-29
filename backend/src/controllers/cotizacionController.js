const Cotizacion = require('../models/Cotizacion');
const CotizacionAdjunto = require('../models/CotizacionAdjunto');
const { borradorVacio, calcularCotizacion } = require('../services/cotizacionCalculoService');
const { obtenerTipoCambioSunat } = require('../services/sunatTipoCambioService');
const { notificarCotizacionEnvioAprobacion } = require('../services/emailService');

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
    const lista = await Cotizacion.listar({
      q: req.query.q,
      ruc: req.query.ruc,
      estado: req.query.estado,
      desde: req.query.desde,
      hasta: req.query.hasta
    });
    res.json({ success: true, data: lista });
  } catch (e) {
    console.error('cotizaciones listar:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar cotizaciones' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const detalle = await Cotizacion.obtenerDetalle(req.params.id);
    if (!detalle) {
      return res.status(404).json({ success: false, mensaje: 'Cotización no encontrada' });
    }
    res.json({ success: true, data: detalle });
  } catch (e) {
    console.error('cotizaciones obtener:', e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener cotización' });
  }
};

exports.crear = async (req, res) => {
  try {
    const detalle = await Cotizacion.crear(req.usuario.id, req.body);
    res.status(201).json({ success: true, data: detalle, mensaje: 'Cotización creada (v1)' });
  } catch (e) {
    console.error('cotizaciones crear:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear cotización' });
  }
};

exports.guardarBorrador = async (req, res) => {
  try {
    const detalle = await Cotizacion.actualizarBorrador(req.params.id, req.body, {
      usuarioId: req.usuario.id
    });
    res.json({ success: true, data: detalle });
  } catch (e) {
    console.error('cotizaciones guardarBorrador:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al guardar borrador' });
  }
};

exports.publicarVersion = async (req, res) => {
  try {
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
    const cot = await Cotizacion.buscarPorId(cotizacionId);
    if (!cot) {
      return res.status(404).json({ success: false, mensaje: 'Cotización no encontrada' });
    }
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
    const cot = await Cotizacion.buscarPorId(cotizacionId);
    if (!cot) {
      return res.status(404).json({ success: false, mensaje: 'Cotización no encontrada' });
    }
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
    const cot = await Cotizacion.buscarPorId(id);
    if (!cot) {
      return res.status(404).json({ success: false, mensaje: 'Cotización no encontrada' });
    }
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
