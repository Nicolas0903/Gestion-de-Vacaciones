const { Empleado } = require('../models');
const { tieneAccesoEfectivoModulo } = require('../utils/portalAcceso');

/**
 * Acceso a rutas de un módulo del portal según modulos_portal (mapa explícito) o rol legacy.
 */
const verificarAccesoModuloPortal = (moduloId) => {
  return async (req, res, next) => {
    if (!req.usuario?.id) {
      return res.status(401).json({ success: false, mensaje: 'No autenticado' });
    }
    try {
      const empleado = await Empleado.buscarPorId(req.usuario.id);
      if (!empleado || !empleado.activo) {
        return res.status(401).json({ success: false, mensaje: 'Usuario no válido' });
      }
      if (!tieneAccesoEfectivoModulo(empleado, moduloId)) {
        return res.status(403).json({ success: false, mensaje: 'Sin acceso a este módulo' });
      }
      next();
    } catch (e) {
      console.error('verificarAccesoModuloPortal:', e);
      res.status(500).json({ success: false, mensaje: 'Error al verificar permisos' });
    }
  };
};

module.exports = { verificarAccesoModuloPortal };
