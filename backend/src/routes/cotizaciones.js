const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/cotizacionController');
const CotizacionAdjunto = require('../models/CotizacionAdjunto');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '../../uploads/cotizaciones');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });

const storageAdjunto = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dir = CotizacionAdjunto.uploadDir(req.params.id);
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    const base = String(file.originalname || 'archivo')
      .replace(/[^\w.\-()+ ]/g, '_')
      .slice(0, 80);
    cb(null, `${Date.now()}-${base}${ext && !base.endsWith(ext) ? ext : ''}`);
  }
});

const fileFilterAdjunto = (req, file, cb) => {
  const name = String(file.originalname || '').toLowerCase();
  const extOk = /\.(pdf|png|jpg|jpeg|gif|doc|docx|xls|xlsx|ppt|pptx|zip)$/.test(name);
  const mime = (file.mimetype || '').toLowerCase();
  const okMime =
    mime.startsWith('image/') ||
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed';
  if (extOk || okMime || (mime === 'application/octet-stream' && extOk)) cb(null, true);
  else cb(new Error('Tipo de archivo no permitido.'), false);
};

const uploadAdjuntoCotizacion = multer({
  storage: storageAdjunto,
  fileFilter: fileFilterAdjunto,
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.use(autenticar, verificarAccesoModuloPortal('cotizaciones'));

router.get('/plantilla', ctrl.plantilla);
router.get('/tipos-proyecto', ctrl.listarTiposProyecto);
router.post('/tipos-proyecto', ctrl.crearTipoProyecto);
router.get('/responsables', ctrl.listarResponsables);
router.get('/tipo-cambio/sunat', ctrl.tipoCambioSunat);
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id/adjuntos', ctrl.listarAdjuntos);
router.post('/:id/adjuntos', uploadAdjuntoCotizacion.single('archivo'), ctrl.subirAdjunto);
router.get('/:id/adjuntos/:adjuntoId/descargar', ctrl.descargarAdjunto);
router.delete('/:id/adjuntos/:adjuntoId', ctrl.eliminarAdjunto);
router.post('/:id/solicitar-aprobacion', ctrl.solicitarAprobacion);
router.get('/:id', ctrl.obtener);
router.put('/:id/borrador', ctrl.guardarBorrador);
router.post('/:id/publicar-version', ctrl.publicarVersion);
router.get('/:id/versiones/:versionNum', ctrl.verVersion);
router.post('/:id/restaurar-version/:versionNum', ctrl.restaurarVersion);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
