const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');
const { autenticar, verificarRol } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(autenticar);

// Rutas de empleados
router.get('/', empleadoController.listar);
router.get('/:id', empleadoController.obtener);
router.get('/:id/subordinados', empleadoController.obtenerSubordinados);

// Cambiar contraseña (cualquier usuario autenticado)
router.put('/me/cambiar-password', empleadoController.cambiarPassword);

// Solo admin puede crear, actualizar, desactivar
router.post('/', verificarRol('admin'), empleadoController.crear);
router.put('/:id', verificarRol('admin'), empleadoController.actualizar);
router.put('/:id/desactivar', verificarRol('admin'), empleadoController.desactivar);
router.put('/:id/reactivar', verificarRol('admin'), empleadoController.reactivar);

module.exports = router;


