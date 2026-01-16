const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const empleadosRoutes = require('./empleados');
const solicitudesRoutes = require('./solicitudes');
const periodosRoutes = require('./periodos');
const notificacionesRoutes = require('./notificaciones');
const pdfRoutes = require('./pdf');

router.use('/auth', authRoutes);
router.use('/empleados', empleadosRoutes);
router.use('/solicitudes', solicitudesRoutes);
router.use('/periodos', periodosRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/pdf', pdfRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Gestor de Vacaciones API'
  });
});

module.exports = router;


