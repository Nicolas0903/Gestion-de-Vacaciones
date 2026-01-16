const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);

// Rutas protegidas
router.get('/perfil', autenticar, authController.perfil);
router.put('/cambiar-password', autenticar, authController.cambiarPassword);
router.post('/refrescar-token', autenticar, authController.refrescarToken);

module.exports = router;


