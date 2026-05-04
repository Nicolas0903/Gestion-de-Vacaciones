const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const cajaChicaController = require('../controllers/cajaChicaController');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads/caja-chica-ingresos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ingresoId = req.params.ingresoId || 'n';
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `caja-ingreso-${ingresoId}-${Date.now()}${ext}`);
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

const uploadAdjuntoIngreso = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }
});

router.use(autenticar, verificarAccesoModuloPortal('caja-chica'));

router.get('/periodos', cajaChicaController.listarPeriodos);
router.post('/periodos', cajaChicaController.crearPeriodo);
router.put('/periodos/:id/ingresos', cajaChicaController.guardarIngresos);
router.post(
  '/periodos/:id/ingresos/:ingresoId/adjunto',
  (req, res, next) => {
    uploadAdjuntoIngreso.single('archivo')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, mensaje: err.message || 'Error al subir archivo.' });
      }
      if (err) {
        return res.status(400).json({ success: false, mensaje: err.message || 'Archivo no válido.' });
      }
      next();
    });
  },
  cajaChicaController.subirAdjuntoIngreso
);
router.get('/periodos/:id/ingresos/:ingresoId/adjunto', cajaChicaController.descargarAdjuntoIngreso);
router.delete('/periodos/:id/ingresos/:ingresoId/adjunto', cajaChicaController.eliminarAdjuntoIngreso);
router.get('/periodos/:id/resumen-pdf', cajaChicaController.descargarResumenPdf);
router.get('/periodos/:id', cajaChicaController.detallePeriodo);
router.post('/periodos/:id/cerrar', cajaChicaController.cerrarPeriodo);
router.post('/periodos/:id/reabrir', cajaChicaController.reabrirPeriodo);
router.post('/periodos/:id/enviar-resumen-rocio', cajaChicaController.enviarResumenRocio);

module.exports = router;
