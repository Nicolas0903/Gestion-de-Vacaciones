const express = require('express');
const router = express.Router();

const asistenteIaController = require('../controllers/asistenteIaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

/**
 * Todas las rutas requieren autenticación. El asistente está habilitado para
 * los roles que aprueban dentro del sistema (admin, contadora, jefe_operaciones).
 * Sigue siendo Nivel 1 (solo lectura: nunca modifica datos).
 */
router.use(verificarToken, verificarRol('admin', 'contadora', 'jefe_operaciones'));

router.get('/estado', asistenteIaController.estado);
router.get('/pendientes', asistenteIaController.pendientes);
router.post('/mensaje', asistenteIaController.enviarMensaje);

module.exports = router;
