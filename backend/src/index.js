require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const routes = require('./routes');

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
  });
};

startServer();


