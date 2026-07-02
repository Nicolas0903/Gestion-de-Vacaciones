const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar, verificarRol } = require('../middleware/auth');
const rendicionPresupuestoController = require('../controllers/rendicionPresupuestoController');
const {
  RENDICION_PRESUPUESTO_MAX_FILE_BYTES,
  RENDICION_PRESUPUESTO_MAX_UPLOAD_MB
} = require('../config/rendicionPresupuestoUpload');

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
  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-pdf'
  ]);
  const name = String(file.originalname || '').toLowerCase();
  const extOk = /\.(pdf|png|jpg|jpeg|gif|doc|docx)$/.test(name);
  const mime = (file.mimetype || '').toLowerCase();
  if (allowed.has(mime) || (mime === 'application/octet-stream' && extOk) || (!mime && extOk)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido (PDF, imagen o Word).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: RENDICION_PRESUPUESTO_MAX_FILE_BYTES }
});

function uploadComprobante(req, res, next) {
  upload.single('comprobante')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const mensaje =
        err.code === 'LIMIT_FILE_SIZE'
          ? `El archivo supera los ${RENDICION_PRESUPUESTO_MAX_UPLOAD_MB} MB permitidos.`
          : err.message || 'Error al subir el archivo.';
      return res.status(status).json({ success: false, mensaje });
    }
    if (err) {
      return res.status(400).json({ success: false, mensaje: err.message || 'Archivo no válido.' });
    }
    next();
  });
}

/** Diagnóstico de deploy (sin auth). */
router.get('/ping', (_req, res) => {
  res.json({
    success: true,
    module: 'rendiciones-presupuesto',
    message: 'API de rendición de presupuesto activa'
  });
});

router.get('/areas', autenticar, rendicionPresupuestoController.catalogoAreas);

router.post('/', autenticar, uploadComprobante, rendicionPresupuestoController.crear);
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
  uploadComprobante,
  rendicionPresupuestoController.actualizarAdmin
);

router.get('/:id/comprobante', autenticar, rendicionPresupuestoController.descargarComprobante);
router.get('/:id', autenticar, rendicionPresupuestoController.obtener);

module.exports = router;
