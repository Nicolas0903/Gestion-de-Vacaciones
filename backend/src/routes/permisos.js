const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken, verificarRol } = require('../middleware/auth');
const permisoController = require('../controllers/permisoController');

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '../../uploads/permisos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subida de documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `permiso-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Permitir PDF, imágenes y documentos
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Use PDF, imágenes o documentos Word.'), false);
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

// Obtener mis permisos/descansos
router.get('/mis-permisos', verificarToken, permisoController.misPermisos);

// Obtener mi resumen
router.get('/mi-resumen', verificarToken, permisoController.miResumen);

// Crear nuevo permiso/descanso
router.post('/', 
  verificarToken, 
  upload.single('documento'),
  permisoController.crear
);

// Obtener detalle de un permiso
router.get('/:id', verificarToken, permisoController.obtener);

// Eliminar permiso (solo pendientes)
router.delete('/:id', verificarToken, permisoController.eliminar);

// Descargar documento adjunto
router.get('/:id/documento', verificarToken, permisoController.descargarDocumento);

// ============================================
// RUTAS ADMIN (Rocío/Contadora)
// ============================================

// Listar todos los permisos
router.get('/', verificarToken, verificarRol('admin', 'contadora'), permisoController.listarTodos);

// Listar pendientes de aprobación
router.get('/admin/pendientes', verificarToken, verificarRol('admin', 'contadora'), permisoController.listarPendientes);

// Obtener permisos para calendario
router.get('/admin/calendario', verificarToken, verificarRol('admin', 'contadora'), permisoController.calendario);

// Crear permiso desde admin (para otro empleado)
router.post('/admin/crear', 
  verificarToken, 
  verificarRol('admin', 'contadora'),
  upload.single('documento'),
  permisoController.crearDesdeAdmin
);

// Aprobar permiso
router.put('/:id/aprobar', verificarToken, verificarRol('admin', 'contadora'), permisoController.aprobar);

// Rechazar permiso
router.put('/:id/rechazar', verificarToken, verificarRol('admin', 'contadora'), permisoController.rechazar);

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
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      mensaje: error.message
    });
  }
  next(error);
});

module.exports = router;
