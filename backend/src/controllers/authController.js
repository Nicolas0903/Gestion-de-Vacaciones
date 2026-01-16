const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Empleado } = require('../models');

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        mensaje: 'Email y contraseña son requeridos'
      });
    }

    const empleado = await Empleado.buscarPorEmail(email);

    if (!empleado) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    if (!empleado.activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Usuario desactivado. Contacta al administrador.'
      });
    }

    const passwordValido = await Empleado.verificarPassword(password, empleado.password);

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    const token = jwt.sign(
      { id: empleado.id, email: empleado.email, rol: empleado.rol_nombre },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Remover password de la respuesta
    const { password: _, ...empleadoSinPassword } = empleado;

    res.json({
      success: true,
      mensaje: 'Login exitoso',
      data: {
        token,
        usuario: empleadoSinPassword
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener perfil del usuario actual
const perfil = async (req, res) => {
  try {
    const { password: _, ...usuarioSinPassword } = req.usuario;
    
    res.json({
      success: true,
      data: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({
        success: false,
        mensaje: 'Contraseña actual y nueva son requeridas'
      });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        success: false,
        mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const empleado = await Empleado.buscarPorId(req.usuario.id);
    const passwordValido = await Empleado.verificarPassword(passwordActual, empleado.password);

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        mensaje: 'Contraseña actual incorrecta'
      });
    }

    await Empleado.actualizar(req.usuario.id, { password: passwordNuevo });

    res.json({
      success: true,
      mensaje: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Refrescar token
const refrescarToken = async (req, res) => {
  try {
    const empleado = await Empleado.buscarPorId(req.usuario.id);

    const token = jwt.sign(
      { id: empleado.id, email: empleado.email, rol: empleado.rol_nombre },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  login,
  perfil,
  cambiarPassword,
  refrescarToken
};


