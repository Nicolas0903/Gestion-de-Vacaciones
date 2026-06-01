const ComisionPorPagar = require('../models/ComisionPorPagar');

const esAdmin = (req) => req.usuario?.rol_nombre === 'admin';

const responderError = (res, err, fallback = 'Error en la operación') => {
  const msg = err?.message || fallback;
  const status = msg.includes('no encontr') ? 404 : 400;
  res.status(status).json({ success: false, mensaje: msg });
};

exports.listar = async (req, res) => {
  try {
    const data = await ComisionPorPagar.listar();
    res.json({ success: true, data });
  } catch (err) {
    console.error('comisiones.listar:', err);
    res.status(500).json({ success: false, mensaje: 'Error al listar comisiones' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const detalle = await ComisionPorPagar.obtenerDetalle(req.params.id);
    if (!detalle) {
      return res.status(404).json({ success: false, mensaje: 'Comisión no encontrada' });
    }
    res.json({ success: true, data: detalle });
  } catch (err) {
    console.error('comisiones.obtener:', err);
    res.status(500).json({ success: false, mensaje: 'Error al obtener comisión' });
  }
};

exports.crear = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      success: false,
      mensaje: 'Solo administradores pueden registrar el encabezado de comisiones'
    });
  }
  try {
    const data = await ComisionPorPagar.crear(req.body, req.usuario.id);
    res.status(201).json({ success: true, data, mensaje: 'Comisión registrada' });
  } catch (err) {
    responderError(res, err, 'No se pudo crear la comisión');
  }
};

exports.actualizar = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      success: false,
      mensaje: 'Solo administradores pueden editar el encabezado de comisiones'
    });
  }
  try {
    const data = await ComisionPorPagar.actualizar(req.params.id, req.body);
    if (!data) {
      return res.status(404).json({ success: false, mensaje: 'Comisión no encontrada' });
    }
    res.json({ success: true, data, mensaje: 'Comisión actualizada' });
  } catch (err) {
    responderError(res, err, 'No se pudo actualizar la comisión');
  }
};

exports.eliminar = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({
      success: false,
      mensaje: 'Solo administradores pueden eliminar comisiones'
    });
  }
  try {
    const ok = await ComisionPorPagar.eliminar(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Comisión no encontrada' });
    }
    res.json({ success: true, mensaje: 'Comisión eliminada' });
  } catch (err) {
    console.error('comisiones.eliminar:', err);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

exports.crearPago = async (req, res) => {
  try {
    const comisionId = req.params.id;
    const body = { ...req.body };
    if (body.orden == null) {
      body.orden = await ComisionPorPagar.siguienteOrden(comisionId);
    }
    const pago = await ComisionPorPagar.crearPago(comisionId, body);
    const detalle = await ComisionPorPagar.obtenerDetalle(comisionId);
    res.status(201).json({ success: true, data: { pago, detalle }, mensaje: 'Fila agregada' });
  } catch (err) {
    responderError(res, err, 'No se pudo agregar la fila');
  }
};

exports.actualizarPago = async (req, res) => {
  try {
    const pago = await ComisionPorPagar.actualizarPago(
      req.params.id,
      req.params.pagoId,
      req.body
    );
    const detalle = await ComisionPorPagar.obtenerDetalle(req.params.id);
    res.json({ success: true, data: { pago, detalle }, mensaje: 'Fila actualizada' });
  } catch (err) {
    responderError(res, err, 'No se pudo actualizar la fila');
  }
};

exports.eliminarPago = async (req, res) => {
  try {
    const ok = await ComisionPorPagar.eliminarPago(req.params.id, req.params.pagoId);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Fila no encontrada' });
    }
    const detalle = await ComisionPorPagar.obtenerDetalle(req.params.id);
    res.json({ success: true, data: detalle, mensaje: 'Fila eliminada' });
  } catch (err) {
    responderError(res, err, 'No se pudo eliminar la fila');
  }
};
