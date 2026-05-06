const express = require('express');
const { autenticar, verificarRol } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/controlProyectoController');

const router = express.Router();

router.use(autenticar, verificarAccesoModuloPortal('control-proyectos'));

router.get('/catalogo', (req, res) => {
  res.json({ success: true, data: ctrl.etiquetasCatalogo() });
});

router.get('/consultores-select', ctrl.consultoresParaProyectos);
router.get('/proyectos', ctrl.listarProyectos);
router.get('/mis-proyectos', ctrl.misProyectos);
router.post('/proyectos', ctrl.crearProyecto);
router.put('/proyectos/:id', ctrl.actualizarProyecto);
router.delete('/proyectos/:id', ctrl.eliminarProyecto);

router.get('/actividades', ctrl.listarActividades);
router.post('/actividades', ctrl.crearActividad);
router.put('/actividades/:id', ctrl.actualizarActividad);

router.get('/reporte', ctrl.reporteDashboard);
router.get('/costo-hora', verificarRol('admin'), ctrl.listarCostosHora);
router.put('/costo-hora/:empleadoId', verificarRol('admin'), ctrl.upsertCostoHora);

module.exports = router;
