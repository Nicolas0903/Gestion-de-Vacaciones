const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { verificarAdminPortalUsuarios } = require('../middleware/adminPortalUsuarios');
const ctrl = require('../controllers/adminPortalUsuariosController');

router.use(autenticar);
router.use(verificarAdminPortalUsuarios);

router.get('/modulos-catalogo', ctrl.listarCatalogoModulos);
router.get('/roles', ctrl.listarRoles);
router.get('/empleados', ctrl.listarEmpleados);
router.post('/empleados', ctrl.crearEmpleado);
router.get('/empleados/:id/vacaciones', ctrl.vacacionesEmpleado);
router.get('/empleados/:id', ctrl.obtenerEmpleado);
router.put('/empleados/:id/cuenta', ctrl.actualizarCuenta);
router.put('/empleados/:id/modulos-portal', ctrl.actualizarModulosPortal);
router.put('/empleados/:id/bloquear', ctrl.bloquearEmpleado);
router.delete('/empleados/:id', ctrl.eliminarPermanentemente);
router.post('/empleados/:id/restablecer-password', ctrl.restablecerPassword);

module.exports = router;
