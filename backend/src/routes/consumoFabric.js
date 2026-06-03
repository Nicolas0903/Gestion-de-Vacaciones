const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { autenticar } = require('../middleware/auth');
const { verificarAccesoModuloPortal } = require('../middleware/moduloPortal');
const ctrl = require('../controllers/consumoFabricController');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads/consumo-fabric');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.xlsx';
    cb(null, `upload-${Date.now()}${ext}`);
  }
});

const excelFilter = (_req, file, cb) => {
  const name = String(file.originalname || '').toLowerCase();
  const ok =
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ok) cb(null, true);
  else cb(new Error('Solo archivos Excel (.xlsx)'), false);
};

const uploadDisk = multer({
  storage,
  fileFilter: excelFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: excelFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(autenticar, verificarAccesoModuloPortal('consumo-fabric'));

router.get('/montos', ctrl.listarMontos);
router.get('/montos/clientes', ctrl.clientesMontos);
router.post('/montos', ctrl.guardarMonto);
router.post('/montos/importar', uploadMemory.single('archivo'), ctrl.importarMontos);
router.delete('/montos/:id', ctrl.eliminarMonto);

router.get('/cargas', ctrl.listarCargas);
router.post('/cargas', uploadDisk.single('archivo'), ctrl.subirPayg);
router.get('/cargas/:id', ctrl.obtenerCarga);
router.get('/cargas/:id/exportar', ctrl.exportarCarga);
router.get('/cargas/:id/exportar-pdf', ctrl.exportarCargaPdf);
router.delete('/cargas/:id', ctrl.eliminarCarga);

module.exports = router;
