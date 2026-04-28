const express = require('express');
const { autenticar, verificarRol } = require('../middleware/auth');
const cajaChicaController = require('../controllers/cajaChicaController');

const router = express.Router();

router.use(autenticar, verificarRol('admin', 'contadora'));

router.get('/periodos', cajaChicaController.listarPeriodos);
router.post('/periodos', cajaChicaController.crearPeriodo);
router.get('/periodos/:id', cajaChicaController.detallePeriodo);
router.put('/periodos/:id/ingresos', cajaChicaController.guardarIngresos);
router.post('/periodos/:id/cerrar', cajaChicaController.cerrarPeriodo);

module.exports = router;
