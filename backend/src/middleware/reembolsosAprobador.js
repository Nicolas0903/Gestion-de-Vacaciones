const { Empleado } = require('../models');

const soloAprobadorReembolsos = async (req, res, next) => {
  try {
    const aprobador = await Empleado.obtenerAprobadorReembolsos();
    if (!aprobador) {
      return res.status(503).json({
        success: false,
        mensaje: 'No está definido el aprobador de reembolsos en el sistema (empleado Enrique Agapito o REEMBOLSOS_APROBADOR_EMPLEADO_ID).'
      });
    }
    if (req.usuario.id !== aprobador.id) {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo el aprobador de reembolsos puede realizar esta acción.'
      });
    }
    next();
  } catch (err) {
    console.error('soloAprobadorReembolsos:', err);
    return res.status(500).json({ success: false, mensaje: 'Error al verificar permisos.' });
  }
};

module.exports = { soloAprobadorReembolsos };
