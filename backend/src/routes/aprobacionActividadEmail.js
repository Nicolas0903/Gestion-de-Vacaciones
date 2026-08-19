const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aprobacionActividadEmailController');

router.get('/aprobar/:token', ctrl.aprobarPorToken);
router.get('/rechazar/:token', ctrl.rechazarPorToken);

module.exports = router;
