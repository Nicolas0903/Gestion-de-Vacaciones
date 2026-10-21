const CierreNegocio = require('../models/CierreNegocio');

exports.listar = async (req, res) => {
  try {
    const data = await CierreNegocio.listar();
    res.json({ success: true, data });
  } catch (e) {
    console.error('cierres listar:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar cierres' });
  }
};

exports.cotizacionesDisponibles = async (req, res) => {
  try {
    const data = await CierreNegocio.listarCotizacionesDisponibles();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al listar cotizaciones' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const detalle = await CierreNegocio.obtenerDetalle(req.params.id);
    if (!detalle) {
      return res.status(404).json({ success: false, mensaje: 'Cierre no encontrado' });
    }
    res.json({ success: true, data: detalle });
  } catch (e) {
    console.error('cierres obtener:', e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener cierre' });
  }
};

exports.crear = async (req, res) => {
  try {
    const body = req.body || {};
    const { cotizacion_id, version_num, ...manual } = body;

    let detalle;
    let mensaje;

    if (cotizacion_id) {
      detalle = await CierreNegocio.crearDesdeCotizacion(
        req.usuario.id,
        cotizacion_id,
        version_num
      );
      mensaje = 'Cierre creado desde cotización';
    } else {
      detalle = await CierreNegocio.crearManual(req.usuario.id, manual);
      mensaje = 'Cierre histórico creado (sin cotización vinculada)';
    }

    res.status(201).json({ success: true, data: detalle, mensaje });
  } catch (e) {
    console.error('cierres crear:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear cierre' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const detalle = await CierreNegocio.actualizar(req.params.id, req.body || {});
    res.json({ success: true, data: detalle });
  } catch (e) {
    console.error('cierres actualizar:', e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const ok = await CierreNegocio.eliminar(req.params.id);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    res.json({ success: true, mensaje: 'Cierre eliminado' });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};
