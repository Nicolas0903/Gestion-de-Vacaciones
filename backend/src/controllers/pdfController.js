const { SolicitudVacaciones, Aprobacion } = require('../models');
const PDFService = require('../services/pdfService');

// Generar PDF de solicitud
const generarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    
    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    // Verificar permisos
    if (solicitud.empleado_id !== req.usuario.id && 
        req.usuario.rol_nombre !== 'admin' && 
        req.usuario.nivel_aprobacion < 1) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para ver esta solicitud'
      });
    }

    const aprobaciones = await Aprobacion.listarPorSolicitud(parseInt(id));
    const pdfBuffer = await PDFService.generarSolicitudVacaciones(solicitud, aprobaciones);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=solicitud-vacaciones-${id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al generar PDF'
    });
  }
};

module.exports = {
  generarSolicitud
};


