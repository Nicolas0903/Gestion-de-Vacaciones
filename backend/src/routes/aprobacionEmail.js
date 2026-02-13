const express = require('express');
const router = express.Router();
const aprobacionEmailController = require('../controllers/aprobacionEmailController');

// Rutas PÚBLICAS (sin autenticación) para aprobar/rechazar desde correo
router.get('/aprobar/:token', aprobacionEmailController.aprobarPorToken);
router.get('/rechazar/:token', aprobacionEmailController.rechazarPorToken);

module.exports = router;
