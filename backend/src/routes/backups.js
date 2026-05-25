const express = require('express');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/backupArchivoController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('archivo-respaldos'));

router.get('/', ctrl.listar);
router.post('/ejecutar', ctrl.ejecutarManual);
router.get('/:id/descargar/:tipo', ctrl.descargar);

module.exports = router;
