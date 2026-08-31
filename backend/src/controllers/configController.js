const emailService = require('../services/emailService');
const { ejecutarResumenPendientesSemanal } = require('../services/pendientesSemanalService');
const { obtenerPendientesDetallados, cargarContextoGlobal } = require('../services/pendientesUsuarioService');
const { Empleado } = require('../models');

// Probar configuración de email
const probarEmail = async (req, res) => {
  try {
    const { destinatario } = req.body;
    
    if (!destinatario) {
      return res.status(400).json({
        success: false,
        mensaje: 'Debes proporcionar un email destinatario'
      });
    }

    // Verificar que sea admin o contadora
    if (req.usuario.rol_nombre !== 'admin' && req.usuario.rol_nombre !== 'contadora') {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para realizar esta acción'
      });
    }

    await emailService.enviarEmailPrueba(destinatario);

    res.json({
      success: true,
      mensaje: `Email de prueba enviado a ${destinatario}`
    });
  } catch (error) {
    console.error('Error al enviar email de prueba:', error);
    res.status(500).json({
      success: false,
      mensaje: `Error al enviar email: ${error.message}`
    });
  }
};

// Verificar estado de configuración de email
const estadoEmail = async (req, res) => {
  try {
    const configurado = await emailService.verificarConexion();
    
    res.json({
      success: true,
      data: {
        configurado,
        servidor: process.env.SMTP_HOST || 'No configurado',
        usuario: process.env.SMTP_USER ? '****' + process.env.SMTP_USER.slice(-15) : 'No configurado'
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        configurado: false,
        error: error.message
      }
    });
  }
};

// Ejecutar envío semanal de pendientes (manual o prueba para un empleado)
const ejecutarPendientesSemanal = async (req, res) => {
  try {
    if (req.usuario.rol_nombre !== 'admin') {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo un administrador puede ejecutar el resumen de pendientes.'
      });
    }

    const empleadoId = req.body?.empleado_id != null ? parseInt(req.body.empleado_id, 10) : null;
    const forzar = req.body?.forzar === true;

    const resultado = await ejecutarResumenPendientesSemanal({
      soloEmpleadoId: Number.isFinite(empleadoId) ? empleadoId : undefined,
      forzar
    });

    res.json({
      success: true,
      mensaje: 'Proceso de resumen de pendientes finalizado.',
      data: resultado
    });
  } catch (error) {
    console.error('Error al ejecutar resumen pendientes semanal:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message || 'Error al ejecutar el resumen de pendientes.'
    });
  }
};

// Vista previa del resumen de pendientes (sin enviar correo)
const previewPendientesSemanal = async (req, res) => {
  try {
    if (req.usuario.rol_nombre !== 'admin') {
      return res.status(403).json({
        success: false,
        mensaje: 'Solo un administrador puede consultar el resumen de pendientes.'
      });
    }

    const empleadoId = parseInt(req.query.empleado_id || req.usuario.id, 10);
    const emp = await Empleado.buscarPorId(empleadoId);
    if (!emp) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado.' });
    }

    const contexto = await cargarContextoGlobal();
    const resumen = await obtenerPendientesDetallados(emp, contexto);

    res.json({
      success: true,
      data: {
        empleado: {
          id: emp.id,
          nombres: emp.nombres,
          apellidos: emp.apellidos,
          email: emp.email,
          rol: emp.rol_nombre
        },
        ...resumen
      }
    });
  } catch (error) {
    console.error('Error preview pendientes semanal:', error);
    res.status(500).json({
      success: false,
      mensaje: error.message || 'Error obteniendo vista previa.'
    });
  }
};

module.exports = {
  probarEmail,
  estadoEmail,
  ejecutarPendientesSemanal,
  previewPendientesSemanal
};
