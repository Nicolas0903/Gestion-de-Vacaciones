const { Notificacion } = require('../models');

// Listar notificaciones
const listar = async (req, res) => {
  try {
    const { solo_no_leidas } = req.query;
    const notificaciones = await Notificacion.listarPorEmpleado(
      req.usuario.id,
      solo_no_leidas === 'true'
    );

    res.json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Contar no leídas
const contarNoLeidas = async (req, res) => {
  try {
    const total = await Notificacion.contarNoLeidas(req.usuario.id);

    res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Error al contar notificaciones:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Marcar como leída
const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    await Notificacion.marcarLeida(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Notificación marcada como leída'
    });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Marcar todas como leídas
const marcarTodasLeidas = async (req, res) => {
  try {
    const cantidad = await Notificacion.marcarTodasLeidas(req.usuario.id);

    res.json({
      success: true,
      mensaje: `${cantidad} notificaciones marcadas como leídas`
    });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Eliminar notificación
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await Notificacion.eliminar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Notificación eliminada'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  listar,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
  eliminar
};


