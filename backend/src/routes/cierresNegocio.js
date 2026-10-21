const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/cierreNegocioController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('cierre-negocio'));

router.get('/cotizaciones-disponibles', ctrl.cotizacionesDisponibles);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
