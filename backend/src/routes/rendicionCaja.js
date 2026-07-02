const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const rendicionCajaController = require('../controllers/rendicionCajaController');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads/rendiciones-presupuesto/depositos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const rid = req.params.rendicionId || 'n';
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `rdp-dep-${rid}-${Date.now()}${ext}`);
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

const uploadDeposito = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }
});

router.use(autenticar, verificarAccesoModuloPortal('caja-rendicion'));

router.get('/periodos/sugeridos', rendicionCajaController.sugerirPeriodos);
router.get('/periodos', rendicionCajaController.listarPeriodos);
router.post('/periodos', rendicionCajaController.crearPeriodo);
router.get('/periodos/:id', rendicionCajaController.detallePeriodo);
router.put('/periodos/:id/depositos', rendicionCajaController.guardarDepositos);
router.post('/periodos/:id/cerrar', rendicionCajaController.cerrarPeriodo);
router.post('/periodos/:id/reabrir', rendicionCajaController.reabrirPeriodo);
router.post(
  '/periodos/:id/rendiciones/:rendicionId/deposito-adjunto',
  (req, res, next) => {
    uploadDeposito.single('archivo')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, mensaje: err.message || 'Error al subir archivo.' });
      }
      if (err) {
        return res.status(400).json({ success: false, mensaje: err.message || 'Archivo no válido.' });
      }
      next();
    });
  },
  rendicionCajaController.subirComprobanteDeposito
);
router.get(
  '/periodos/:id/rendiciones/:rendicionId/deposito-adjunto',
  rendicionCajaController.descargarComprobanteDeposito
);
router.delete(
  '/periodos/:id/rendiciones/:rendicionId/deposito-adjunto',
  rendicionCajaController.eliminarComprobanteDeposito
);

module.exports = router;
