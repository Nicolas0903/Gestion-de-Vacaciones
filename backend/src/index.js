require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {
  REEMBOLSOS_MAX_UPLOAD_MB,
  REEMBOLSOS_MAX_FILE_BYTES
} = require('./config/reembolsosUpload');
const { testConnection } = require('./config/database');
const routes = require('./routes');
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api', routes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Gestor de Vacaciones API - Prayaga',
    version: '1.0.0',
    documentacion: '/api/health'
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    mensaje: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: `El archivo supera el tamaño máximo permitido (${REEMBOLSOS_MAX_UPLOAD_MB} MB). Comprima la imagen o el PDF e inténtelo de nuevo.`,
      LIMIT_FILE_COUNT:
        'Solo se permite un archivo por envío. Elimine archivos extra e inténtelo de nuevo.',
      LIMIT_UNEXPECTED_FILE:
        'El archivo no corresponde al campo esperado (comprobante). Recargue la página y adjunte el archivo en el lugar indicado.',
      LIMIT_FIELD_COUNT:
        'Demasiados campos en el formulario. Recargue la página e inténtelo de nuevo.',
      LIMIT_PART_COUNT: 'El envío es demasiado grande. Revise el tamaño del archivo e inténtelo de nuevo.',
      LIMIT_FIELD_KEY: 'Nombre de campo demasiado largo.',
      LIMIT_FIELD_VALUE: 'Algún dato del formulario es demasiado largo.'
    };
    const mensaje =
      mensajes[err.code] ||
      `No se pudo procesar el archivo (${err.code}).`;
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, mensaje });
  }

  const msg = typeof err.message === 'string' ? err.message.trim() : '';
  const esFiltroTipoArchivo =
    msg.includes('Tipo de archivo no permitido') || msg.includes('Solo se permiten archivos PDF');
  if (msg && esFiltroTipoArchivo) {
    return res.status(400).json({
      success: false,
      mensaje: msg.endsWith('.') ? msg : `${msg}.`
    });
  }

  res.status(500).json({
    success: false,
    mensaje: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const startServer = async () => {
  // Probar conexión a la base de datos
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  No se pudo conectar a MySQL. Algunas funciones pueden no estar disponibles.');
  }

  // Verificar configuración de email
  await emailService.verificarConexion();

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏖️  GESTOR DE VACACIONES - PRAYAGA                       ║
║                                                            ║
║   Servidor corriendo en: http://localhost:${PORT}            ║
║   Ambiente: ${process.env.NODE_ENV || 'development'}                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    console.log(
      `Reintegros: comprobante hasta ${REEMBOLSOS_MAX_UPLOAD_MB} MB (${REEMBOLSOS_MAX_FILE_BYTES} bytes).`
    );
  });
};

startServer();


