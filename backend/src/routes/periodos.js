const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodoController');
const { autenticar, verificarRol } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(autenticar);

// Rutas para empleados
router.get('/mis-periodos', periodoController.listarMios);
router.get('/mis-periodos/pendientes', periodoController.obtenerPendientes);
router.get('/mi-resumen', periodoController.obtenerResumen);

// Rutas para admin
router.post('/', verificarRol('admin'), periodoController.crear);
router.get('/empleado/:empleadoId', verificarRol('admin', 'contadora', 'jefe_operaciones'), periodoController.listarPorEmpleado);
router.get('/empleado/:empleadoId/pendientes', periodoController.obtenerPendientes);
router.get('/empleado/:empleadoId/resumen', periodoController.obtenerResumen);
router.post('/empleado/:empleadoId/generar', verificarRol('admin'), periodoController.generarPeriodos);
router.put('/:id', verificarRol('admin'), periodoController.actualizar);
router.delete('/:id', verificarRol('admin'), periodoController.eliminar);

module.exports = router;


