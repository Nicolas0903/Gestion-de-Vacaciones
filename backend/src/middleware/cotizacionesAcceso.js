const { Empleado } = require('../models');
const { tieneAccesoEfectivoModulo } = require('../utils/portalAcceso');

/** Rutas API cotizaciones: equipo de elaboración o comercial (solicitud de cotización). */
async function verificarAccesoModuloCotizacionesApi(req, res, next) {
  if (!req.usuario?.id) {
    return res.status(401).json({ success: false, mensaje: 'No autenticado' });
  }
  try {
    const empleado = await Empleado.buscarPorId(req.usuario.id);
    if (!empleado?.activo) {
      return res.status(401).json({ success: false, mensaje: 'Usuario no válido' });
    }
    const ok =
      tieneAccesoEfectivoModulo(empleado, 'cotizaciones') ||
      tieneAccesoEfectivoModulo(empleado, 'solicitud-cotizacion');
    if (!ok) {
      return res.status(403).json({ success: false, mensaje: 'Sin acceso a cotizaciones' });
    }
    req.empleadoPortal = empleado;
    next();
  } catch (e) {
    console.error('verificarAccesoModuloCotizacionesApi:', e);
    res.status(500).json({ success: false, mensaje: 'Error al verificar permisos' });
  }
}

module.exports = { verificarAccesoModuloCotizacionesApi };
