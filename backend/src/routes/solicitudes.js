const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { autenticar, verificarRol, verificarNivelAprobacion } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(autenticar);

// Rutas para empleados
router.post('/', solicitudController.crear);
router.get('/mis-solicitudes', solicitudController.listarMias);
router.put('/:id/enviar', solicitudController.enviar);
router.put('/:id/cancelar', solicitudController.cancelar);

// Rutas para calendario
router.get('/calendario', solicitudController.obtenerCalendario);

// Rutas para aprobadores
router.get('/pendientes-aprobacion', verificarNivelAprobacion(1), solicitudController.listarPendientesAprobacion);
router.put('/:id/aprobar', verificarNivelAprobacion(1), solicitudController.aprobar);
router.put('/:id/rechazar', verificarNivelAprobacion(1), solicitudController.rechazar);

// Rutas admin
router.get('/todas', verificarRol('admin', 'contadora'), solicitudController.listarTodas);

// Obtener salidas por período
router.get('/periodo/:periodoId/salidas', solicitudController.obtenerSalidasPorPeriodo);

// Obtener solicitud específica (debe ir al final para no conflictar con otras rutas)
router.get('/:id', solicitudController.obtener);

// Eliminar solicitud
router.delete('/:id', solicitudController.eliminar);

module.exports = router;


