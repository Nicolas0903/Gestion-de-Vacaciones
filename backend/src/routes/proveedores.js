const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/proveedoresController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('proveedores'));

router.get('/catalogos', ctrl.catalogos);

router.get('/', ctrl.listarProveedores);
router.post('/', ctrl.crearProveedor);
router.get('/evaluaciones', ctrl.listarEvaluaciones);
router.post('/evaluaciones', ctrl.crearEvaluacion);
router.get('/evaluaciones/:id', ctrl.obtenerEvaluacion);
router.put('/evaluaciones/:id', ctrl.actualizarEvaluacion);
router.delete('/evaluaciones/:id', ctrl.eliminarEvaluacion);
router.post('/evaluaciones/:id/registrar-ganador', ctrl.registrarGanador);

router.get('/reevaluaciones', ctrl.listarReevaluaciones);
router.post('/reevaluaciones/preview-resultado', ctrl.previewResultadoReeval);
router.post('/reevaluaciones', ctrl.crearReevaluacion);
router.get('/reevaluaciones/:id', ctrl.obtenerReevaluacion);
router.put('/reevaluaciones/:id', ctrl.actualizarReevaluacion);
router.delete('/reevaluaciones/:id', ctrl.eliminarReevaluacion);

router.get('/:id', ctrl.obtenerProveedor);
router.put('/:id', ctrl.actualizarProveedor);
router.delete('/:id', ctrl.eliminarProveedor);

module.exports = router;
