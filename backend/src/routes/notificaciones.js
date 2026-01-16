const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { autenticar } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(autenticar);

router.get('/', notificacionController.listar);
router.get('/no-leidas/count', notificacionController.contarNoLeidas);
router.put('/:id/leer', notificacionController.marcarLeida);
router.put('/leer-todas', notificacionController.marcarTodasLeidas);
router.delete('/:id', notificacionController.eliminar);

module.exports = router;


