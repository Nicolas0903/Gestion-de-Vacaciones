const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/cotizacionSolicitudController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('solicitud-cotizacion'));

router.get('/responsables', ctrl.listarResponsables);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.post('/:id/crear-cotizacion', ctrl.crearCotizacionDesdeSolicitud);

module.exports = router;
