const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { verificarToken, verificarRol } = require('../middleware/auth');

// Solo admin y contadora pueden acceder a estas rutas
router.use(verificarToken);

// Verificar estado de email
router.get('/email/estado', verificarRol(['admin', 'contadora']), configController.estadoEmail);

// Probar envío de email
router.post('/email/probar', verificarRol(['admin', 'contadora']), configController.probarEmail);

module.exports = router;
