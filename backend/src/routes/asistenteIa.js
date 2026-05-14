const express = require('express');
const router = express.Router();

const asistenteIaController = require('../controllers/asistenteIaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

/**
 * Todas las rutas requieren autenticación + rol admin.
 * Por ahora el asistente solo está habilitado para admin (Nivel 1: lectura).
 */
router.use(verificarToken, verificarRol('admin'));

router.get('/estado', asistenteIaController.estado);
router.post('/mensaje', asistenteIaController.enviarMensaje);

module.exports = router;
