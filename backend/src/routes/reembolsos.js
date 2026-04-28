const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar, verificarRol } = require('../middleware/auth');
const { soloAprobadorReembolsos } = require('../middleware/reembolsosAprobador');
const reembolsoController = require('../controllers/reembolsoController');

const router = express.Router();

const uploadsComprobantes = path.join(__dirname, '../../uploads/reembolsos/comprobantes');
if (!fs.existsSync(uploadsComprobantes)) {
  fs.mkdirSync(uploadsComprobantes, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsComprobantes),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `reembolso-${unique}${ext}`);
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
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/', autenticar, upload.single('comprobante'), reembolsoController.crear);
router.get('/mis-solicitudes', autenticar, reembolsoController.misSolicitudes);
router.get('/pendientes', autenticar, soloAprobadorReembolsos, reembolsoController.listarPendientes);
router.get('/todos', autenticar, soloAprobadorReembolsos, reembolsoController.listarTodos);

router.put('/:id/observar', autenticar, soloAprobadorReembolsos, reembolsoController.observar);
router.put('/:id/aprobar', autenticar, soloAprobadorReembolsos, reembolsoController.aprobar);
router.put('/:id/rechazar', autenticar, soloAprobadorReembolsos, reembolsoController.rechazar);
router.delete('/:id', autenticar, verificarRol('admin'), reembolsoController.eliminar);

router.get('/:id/recibo', autenticar, reembolsoController.descargarReciboPdf);
router.get('/:id/comprobante', autenticar, reembolsoController.descargarComprobante);
router.get('/:id', autenticar, reembolsoController.obtener);

module.exports = router;
