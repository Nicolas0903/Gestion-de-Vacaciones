const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const cajaChicaController = require('../controllers/cajaChicaController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('caja-chica'));

router.get('/periodos', cajaChicaController.listarPeriodos);
router.post('/periodos', cajaChicaController.crearPeriodo);
router.get('/periodos/:id/resumen-pdf', cajaChicaController.descargarResumenPdf);
router.get('/periodos/:id', cajaChicaController.detallePeriodo);
router.put('/periodos/:id/ingresos', cajaChicaController.guardarIngresos);
router.post('/periodos/:id/cerrar', cajaChicaController.cerrarPeriodo);
router.post('/periodos/:id/reabrir', cajaChicaController.reabrirPeriodo);
router.post('/periodos/:id/enviar-resumen-rocio', cajaChicaController.enviarResumenRocio);

module.exports = router;
