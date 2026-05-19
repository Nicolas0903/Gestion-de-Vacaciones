const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar, verificarRol } = require('../middleware/auth');
const rendicionPresupuestoController = require('../controllers/rendicionPresupuestoController');
const { RENDICION_PRESUPUESTO_MAX_FILE_BYTES } = require('../config/rendicionPresupuestoUpload');

const router = express.Router();

const uploadsComprobantes = path.join(__dirname, '../../uploads/rendiciones-presupuesto/comprobantes');
if (!fs.existsSync(uploadsComprobantes)) {
  fs.mkdirSync(uploadsComprobantes, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsComprobantes),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `rendicion-${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: RENDICION_PRESUPUESTO_MAX_FILE_BYTES }
});

router.get('/areas', autenticar, rendicionPresupuestoController.catalogoAreas);

router.post('/', autenticar, upload.single('comprobante'), rendicionPresupuestoController.crear);
router.get('/mis-solicitudes', autenticar, rendicionPresupuestoController.misSolicitudes);
router.get('/pendientes', autenticar, verificarRol('admin'), rendicionPresupuestoController.listarPendientes);
router.get('/todos', autenticar, verificarRol('admin'), rendicionPresupuestoController.listarTodos);

router.put('/:id/observar', autenticar, verificarRol('admin'), rendicionPresupuestoController.observar);
router.put('/:id/aprobar', autenticar, verificarRol('admin'), rendicionPresupuestoController.aprobar);
router.put('/:id/rechazar', autenticar, verificarRol('admin'), rendicionPresupuestoController.rechazar);
router.delete('/:id', autenticar, rendicionPresupuestoController.eliminar);

router.put(
  '/:id/admin',
  autenticar,
  verificarRol('admin'),
  upload.single('comprobante'),
  rendicionPresupuestoController.actualizarAdmin
);

router.get('/:id/comprobante', autenticar, rendicionPresupuestoController.descargarComprobante);
router.get('/:id', autenticar, rendicionPresupuestoController.obtener);

module.exports = router;
