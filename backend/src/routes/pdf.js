const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { autenticar } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(autenticar);

router.get('/solicitud/:id', pdfController.generarSolicitud);

module.exports = router;


