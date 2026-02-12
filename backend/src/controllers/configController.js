const emailService = require('../services/emailService');

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

module.exports = {
  probarEmail,
  estadoEmail
};
