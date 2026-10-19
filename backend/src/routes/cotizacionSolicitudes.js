const express = require('express');
const { autenticar } = require('../middleware/auth');
const { Empleado } = require('../models');
const { tieneAccesoEfectivoModulo } = require('../utils/portalAcceso');
const ctrl = require('../controllers/cotizacionSolicitudController');

const router = express.Router();

async function accesoSolicitudOCotizaciones(req, res, next) {
  if (!req.usuario?.id) {
    return res.status(401).json({ success: false, mensaje: 'No autenticado' });
  }
  try {
    const empleado = await Empleado.buscarPorId(req.usuario.id);
    if (!empleado?.activo) {
      return res.status(401).json({ success: false, mensaje: 'Usuario no válido' });
    }
    const ok =
      tieneAccesoEfectivoModulo(empleado, 'solicitud-cotizacion') ||
      tieneAccesoEfectivoModulo(empleado, 'cotizaciones');
    if (!ok) {
      return res.status(403).json({ success: false, mensaje: 'Sin acceso a este módulo' });
    }
    next();
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al verificar permisos' });
  }
}

router.use(autenticar, accesoSolicitudOCotizaciones);

router.get('/responsables', ctrl.listarResponsables);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.post('/:id/cancelar', ctrl.cancelar);
router.delete('/:id', ctrl.eliminar);
router.post('/:id/crear-cotizacion', ctrl.crearCotizacionDesdeSolicitud);

module.exports = router;
