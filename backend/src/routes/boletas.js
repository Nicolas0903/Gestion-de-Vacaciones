const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken, verificarRol } = require('../middleware/auth');
const boletaController = require('../controllers/boletaController');

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '../../uploads/boletas');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subida de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `boleta-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// ============================================
// RUTAS PARA EMPLEADOS
// ============================================

// Obtener mis boletas
router.get('/mis-boletas', verificarToken, boletaController.misBoletas);

// Obtener años disponibles para el empleado
router.get('/mis-anios', verificarToken, boletaController.misAniosDisponibles);

// Firmar boleta (confirmar recepción)
router.put('/:id/firmar', verificarToken, boletaController.firmarBoleta);

// Descargar boleta
router.get('/:id/descargar', verificarToken, boletaController.descargarBoleta);

// ============================================
// RUTAS ADMIN (Rocío/Contadora)
// ============================================

// Listar todas las boletas
router.get('/', verificarToken, verificarRol('admin', 'contadora'), boletaController.listarBoletas);

// Obtener todos los años disponibles
router.get('/anios', verificarToken, verificarRol('admin', 'contadora'), boletaController.obtenerAnios);

// Obtener resumen de boletas por mes/año
router.get('/resumen', verificarToken, verificarRol('admin', 'contadora'), boletaController.obtenerResumen);

// Subir boleta individual
router.post('/subir', 
  verificarToken, 
  verificarRol('admin', 'contadora'), 
  upload.single('archivo'),
  boletaController.subirBoleta
);

// Subir boletas masivamente
router.post('/subir-masivo', 
  verificarToken, 
  verificarRol('admin', 'contadora'), 
  upload.array('archivos', 50), // Máximo 50 archivos
  boletaController.subirBoletasMasivo
);

// Eliminar boleta
router.delete('/:id', verificarToken, verificarRol('admin', 'contadora'), boletaController.eliminarBoleta);

// Manejo de errores de Multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        mensaje: 'El archivo excede el tamaño máximo permitido (10MB)'
      });
    }
    return res.status(400).json({
      success: false,
      mensaje: error.message
    });
  }
  if (error.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({
      success: false,
      mensaje: error.message
    });
  }
  next(error);
});

module.exports = router;
