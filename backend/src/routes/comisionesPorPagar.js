const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/comisionesPorPagarController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('comisiones-por-pagar'));

router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

router.post('/:id/pagos', ctrl.crearPago);
router.put('/:id/pagos/:pagoId', ctrl.actualizarPago);
router.delete('/:id/pagos/:pagoId', ctrl.eliminarPago);

module.exports = router;
