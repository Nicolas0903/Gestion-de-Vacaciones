const Cotizacion = require('../models/Cotizacion');
const { borradorVacio, calcularCotizacion } = require('../services/cotizacionCalculoService');
const { obtenerTipoCambioSunat } = require('../services/sunatTipoCambioService');

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
    const lista = await Cotizacion.listar();
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
