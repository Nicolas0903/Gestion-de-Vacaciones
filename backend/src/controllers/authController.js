const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwtConfig = require('../config/jwt');
const { Empleado } = require('../models');
const TokenRecuperacion = require('../models/TokenRecuperacion');
const SolicitudRegistro = require('../models/SolicitudRegistro');
const { pool } = require('../config/database');
const emailService = require('../services/emailService');

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

// Solicitar recuperación de contraseña
const solicitarRecuperacion = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        mensaje: 'El email es requerido'
      });
    }

    const empleado = await Empleado.buscarPorEmail(email);

    // Por seguridad, siempre devolvemos éxito aunque el email no exista
    if (!empleado) {
      return res.json({
        success: true,
        mensaje: 'Si el email está registrado, recibirás un enlace de recuperación'
      });
    }

    // Crear token de recuperación
    const token = await TokenRecuperacion.crear(empleado.id);

    // Enviar email
    await emailService.enviarRecuperacionPassword(empleado, token);

    res.json({
      success: true,
      mensaje: 'Si el email está registrado, recibirás un enlace de recuperación'
    });
  } catch (error) {
    console.error('Error al solicitar recuperación:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Verificar token de recuperación
const verificarTokenRecuperacion = async (req, res) => {
  try {
    const { token } = req.params;

    const tokenData = await TokenRecuperacion.buscar(token);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        mensaje: 'El enlace es inválido o ha expirado'
      });
    }

    res.json({
      success: true,
      data: {
        email: tokenData.email,
        nombres: tokenData.nombres,
        apellidos: tokenData.apellidos
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Restablecer contraseña
const restablecerPassword = async (req, res) => {
  try {
    const { token, passwordNuevo } = req.body;

    if (!token || !passwordNuevo) {
      return res.status(400).json({
        success: false,
        mensaje: 'Token y nueva contraseña son requeridos'
      });
    }

    if (passwordNuevo.length < 6) {
      return res.status(400).json({
        success: false,
        mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const tokenData = await TokenRecuperacion.buscar(token);

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        mensaje: 'El enlace es inválido o ha expirado'
      });
    }

    // Actualizar contraseña
    await Empleado.actualizar(tokenData.empleado_id, { password: passwordNuevo });

    // Marcar token como usado
    await TokenRecuperacion.marcarUsado(token);

    res.json({
      success: true,
      mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Solicitar registro de cuenta
const solicitarRegistro = async (req, res) => {
  try {
    const { nombres, apellidos, email, dni, telefono, cargo_solicitado, motivo } = req.body;

    if (!nombres || !apellidos || !email) {
      return res.status(400).json({
        success: false,
        mensaje: 'Nombres, apellidos y email son requeridos'
      });
    }

    // Verificar si el email ya está registrado como empleado
    const empleadoExistente = await Empleado.buscarPorEmail(email);
    if (empleadoExistente) {
      return res.status(400).json({
        success: false,
        mensaje: 'Este email ya está registrado en el sistema'
      });
    }

    // Verificar si ya hay una solicitud pendiente con este email
    const solicitudExistente = await SolicitudRegistro.buscarPorEmail(email);
    if (solicitudExistente && solicitudExistente.estado === 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya existe una solicitud de registro pendiente con este email'
      });
    }

    // Crear la solicitud
    const solicitudId = await SolicitudRegistro.crear({
      nombres, apellidos, email, dni, telefono, cargo_solicitado, motivo
    });

    // Buscar a la contadora para notificarle
    const [contadoras] = await pool.execute(
      `SELECT e.* FROM empleados e 
       JOIN roles r ON e.rol_id = r.id 
       WHERE r.nombre = 'contadora' AND e.activo = 1 
       LIMIT 1`
    );

    if (contadoras.length > 0) {
      await emailService.notificarNuevaSolicitudRegistro(
        { nombres, apellidos, email, dni, cargo_solicitado, motivo },
        contadoras[0]
      );
    }

    res.json({
      success: true,
      mensaje: 'Solicitud de registro enviada. Recibirás un email cuando sea revisada.',
      data: { id: solicitudId }
    });
  } catch (error) {
    console.error('Error al solicitar registro:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar solicitudes de registro (solo admin/contadora)
const listarSolicitudesRegistro = async (req, res) => {
  try {
    const { estado } = req.query;
    
    let solicitudes;
    if (estado === 'pendiente') {
      solicitudes = await SolicitudRegistro.listarPendientes();
    } else {
      solicitudes = await SolicitudRegistro.listarTodas();
    }

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Aprobar solicitud de registro (solo admin/contadora)
const aprobarSolicitudRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol_id, jefe_id, comentarios } = req.body;

    const solicitud = await SolicitudRegistro.buscarPorId(id);

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Esta solicitud ya fue procesada'
      });
    }

    // Generar contraseña temporal
    const passwordTemporal = crypto.randomBytes(4).toString('hex');
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    // Crear el empleado
    const [result] = await pool.execute(
      `INSERT INTO empleados (nombres, apellidos, email, dni, telefono, password, rol_id, jefe_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        solicitud.nombres,
        solicitud.apellidos,
        solicitud.email,
        solicitud.dni || null,
        solicitud.telefono || null,
        passwordHash,
        rol_id || 5, // rol_id 5 = empleado por defecto
        jefe_id || null
      ]
    );

    // Marcar solicitud como aprobada
    await SolicitudRegistro.aprobar(id, req.usuario.id, comentarios);

    // Enviar email con credenciales
    await emailService.notificarRegistroAprobado(solicitud, passwordTemporal);

    res.json({
      success: true,
      mensaje: 'Solicitud aprobada. Se ha creado la cuenta y enviado las credenciales por email.',
      data: { empleado_id: result.insertId }
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Rechazar solicitud de registro (solo admin/contadora)
const rechazarSolicitudRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;

    const solicitud = await SolicitudRegistro.buscarPorId(id);

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Esta solicitud ya fue procesada'
      });
    }

    // Marcar como rechazada
    await SolicitudRegistro.rechazar(id, req.usuario.id, comentarios);

    // Notificar al solicitante
    await emailService.notificarRegistroRechazado(solicitud, comentarios);

    res.json({
      success: true,
      mensaje: 'Solicitud rechazada'
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Contar solicitudes pendientes
const contarSolicitudesPendientes = async (req, res) => {
  try {
    const total = await SolicitudRegistro.contarPendientes();
    res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Error al contar solicitudes:', error);
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
  refrescarToken,
  solicitarRecuperacion,
  verificarTokenRecuperacion,
  restablecerPassword,
  solicitarRegistro,
  listarSolicitudesRegistro,
  aprobarSolicitudRegistro,
  rechazarSolicitudRegistro,
  contarSolicitudesPendientes
};


