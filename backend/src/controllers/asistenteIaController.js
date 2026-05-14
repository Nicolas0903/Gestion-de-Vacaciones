const asistenteIaService = require('../services/asistenteIaService');

/**
 * El frontend envía:
 *   - mensaje: string del usuario (turno actual)
 *   - historial: array opcional de mensajes anteriores (formato Gemini Content[])
 *
 * Devolvemos:
 *   - respuesta: texto final del bot
 *   - historial: el historial ACTUALIZADO (con el turn actual ya agregado para que
 *     el frontend pueda enviarlo en la siguiente request — chat sin estado en el server).
 *   - acciones: lista de funciones ejecutadas (para debug / auditoría liviana).
 */
const enviarMensaje = async (req, res) => {
  try {
    const { mensaje, historial } = req.body;

    if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
      return res.status(400).json({
        success: false,
        mensaje: 'El campo "mensaje" es obligatorio.'
      });
    }

    if (historial != null && !Array.isArray(historial)) {
      return res.status(400).json({
        success: false,
        mensaje: 'El campo "historial" debe ser un array (o vacío).'
      });
    }

    /* Sanitizamos el historial: solo aceptamos turnos con role y parts.text para
     * evitar que el cliente envíe function-calls inventadas. El historial visible
     * (para Gemini) es siempre de turnos user/model con texto plano. Los
     * function-calls intermedios se generan dentro del servicio. */
    const historialLimpio = (historial || [])
      .filter((h) => h && (h.role === 'user' || h.role === 'model'))
      .map((h) => ({
        role: h.role,
        parts: [{ text: String(h.parts?.[0]?.text || h.text || '').slice(0, 4000) }]
      }))
      .slice(-20); // máximo 20 turnos previos para acotar tokens

    const { texto, accionesEjecutadas } = await asistenteIaService.procesarMensaje(
      historialLimpio,
      mensaje.trim()
    );

    const nuevoHistorial = [
      ...historialLimpio,
      { role: 'user', parts: [{ text: mensaje.trim() }] },
      { role: 'model', parts: [{ text: texto }] }
    ];

    res.json({
      success: true,
      data: {
        respuesta: texto,
        historial: nuevoHistorial,
        acciones: accionesEjecutadas
      }
    });
  } catch (err) {
    console.error('[asistenteIaController] Error:', err);
    res.status(500).json({
      success: false,
      mensaje: err.message || 'Error interno del asistente IA'
    });
  }
};

const estado = async (req, res) => {
  const configurado = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  res.json({
    success: true,
    data: {
      configurado,
      modelo: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      nivel: 'lectura' // En Nivel 1 solo soporta consultas
    }
  });
};

module.exports = {
  enviarMensaje,
  estado
};
