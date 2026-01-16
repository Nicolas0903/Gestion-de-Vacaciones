const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Empleado } = require('../models');

// Middleware de autenticación
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        mensaje: 'Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, jwtConfig.secret);
    const empleado = await Empleado.buscarPorId(decoded.id);

    if (!empleado) {
      return res.status(401).json({
        success: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (!empleado.activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Usuario desactivado'
      });
    }

    req.usuario = empleado;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        mensaje: 'Token expirado'
      });
    }
    return res.status(401).json({
      success: false,
      mensaje: 'Token inválido'
    });
  }
};

// Middleware para verificar roles
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'No autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol_nombre)) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para esta acción'
      });
    }

    next();
  };
};

// Middleware para verificar nivel de aprobación
const verificarNivelAprobacion = (nivelMinimo) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'No autenticado'
      });
    }

    if (req.usuario.nivel_aprobacion < nivelMinimo) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes el nivel de aprobación requerido'
      });
    }

    next();
  };
};

// Middleware para verificar si es el propio usuario o admin
const verificarPropioOAdmin = (req, res, next) => {
  const idSolicitado = parseInt(req.params.id);

  if (req.usuario.id === idSolicitado || req.usuario.rol_nombre === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    mensaje: 'No tienes permisos para acceder a este recurso'
  });
};

module.exports = {
  autenticar,
  verificarRol,
  verificarNivelAprobacion,
  verificarPropioOAdmin
};


