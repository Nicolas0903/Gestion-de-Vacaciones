const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/cotizacionController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('cotizaciones'));

router.get('/plantilla', ctrl.plantilla);
router.get('/tipos-proyecto', ctrl.listarTiposProyecto);
router.post('/tipos-proyecto', ctrl.crearTipoProyecto);
router.get('/responsables', ctrl.listarResponsables);
router.get('/tipo-cambio/sunat', ctrl.tipoCambioSunat);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id/borrador', ctrl.guardarBorrador);
router.post('/:id/publicar-version', ctrl.publicarVersion);
router.get('/:id/versiones/:versionNum', ctrl.verVersion);
router.post('/:id/restaurar-version/:versionNum', ctrl.restaurarVersion);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
