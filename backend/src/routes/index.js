const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const empleadosRoutes = require('./empleados');
const solicitudesRoutes = require('./solicitudes');
const periodosRoutes = require('./periodos');
const notificacionesRoutes = require('./notificaciones');
const pdfRoutes = require('./pdf');
const boletasRoutes = require('./boletas');
const permisosRoutes = require('./permisos');
const configRoutes = require('./config');
const aprobacionEmailRoutes = require('./aprobacionEmail');
const aprobacionReembolsoEmailRoutes = require('./aprobacionReembolsoEmail');
const aprobacionRendicionEmailRoutes = require('./aprobacionRendicionEmail');
const reembolsosRoutes = require('./reembolsos');
const rendicionesPresupuestoRoutes = require('./rendicionesPresupuesto');
const cajaChicaRoutes = require('./cajaChica');
const rendicionCajaRoutes = require('./rendicionCaja');
const adminPortalUsuariosRoutes = require('./adminPortalUsuarios');
const controlProyectosRoutes = require('./controlProyectos');
const asistenteIaRoutes = require('./asistenteIa');
const proveedoresRoutes = require('./proveedores');

router.use('/auth', authRoutes);
router.use('/empleados', empleadosRoutes);
router.use('/solicitudes', solicitudesRoutes);
router.use('/periodos', periodosRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/pdf', pdfRoutes);
router.use('/boletas', boletasRoutes);
router.use('/permisos', permisosRoutes);
router.use('/config', configRoutes);
router.use('/aprobacion-email', aprobacionEmailRoutes);
router.use('/aprobacion-reembolso-email', aprobacionReembolsoEmailRoutes);
router.use('/aprobacion-rendicion-email', aprobacionRendicionEmailRoutes);
router.use('/reembolsos', reembolsosRoutes);
router.use('/rendiciones-presupuesto', rendicionesPresupuestoRoutes);
router.use('/caja-chica', cajaChicaRoutes);
router.use('/caja-rendicion', rendicionCajaRoutes);
router.use('/admin-portal-usuarios', adminPortalUsuariosRoutes);
router.use('/control-proyectos', controlProyectosRoutes);
router.use('/asistente-ia', asistenteIaRoutes);
router.use('/proveedores', proveedoresRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Gestor de Vacaciones API'
  });
});

module.exports = router;


