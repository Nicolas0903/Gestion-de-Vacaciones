const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar, verificarRol } = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);

// Recuperación de contraseña (públicas)
router.post('/recuperar-password', authController.solicitarRecuperacion);
router.get('/verificar-token/:token', authController.verificarTokenRecuperacion);
router.post('/restablecer-password', authController.restablecerPassword);

// Solicitud de registro (pública)
router.post('/solicitar-registro', authController.solicitarRegistro);

// Rutas protegidas
router.get('/perfil', autenticar, authController.perfil);
router.put('/cambiar-password', autenticar, authController.cambiarPassword);
router.post('/refrescar-token', autenticar, authController.refrescarToken);

// Gestión de solicitudes de registro (solo admin/contadora)
router.get('/solicitudes-registro', autenticar, verificarRol('admin', 'contadora'), authController.listarSolicitudesRegistro);
router.get('/solicitudes-registro/pendientes/count', autenticar, verificarRol('admin', 'contadora'), authController.contarSolicitudesPendientes);
router.put('/solicitudes-registro/:id/aprobar', autenticar, verificarRol('admin', 'contadora'), authController.aprobarSolicitudRegistro);
router.put('/solicitudes-registro/:id/rechazar', autenticar, verificarRol('admin', 'contadora'), authController.rechazarSolicitudRegistro);

module.exports = router;


