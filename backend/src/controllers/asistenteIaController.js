const asistenteIaService = require('../services/asistenteIaService');

/**
 * El frontend envía:
 *   - mensaje: string del usuario (turno actual)
 *   - historial: array opcional de mensajes previos en formato OpenAI
 *     `{ role: 'user'|'assistant', content: string }`.
 *
 * Devolvemos:
 *   - respuesta: texto final del bot
 *   - historial: el historial ACTUALIZADO (incluye el turno actual)
 *   - acciones: lista de funciones ejecutadas (para debug)
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

    /* Sanitizamos: solo aceptamos turnos de user/assistant con content string.
     * No aceptamos tool_calls inyectados por el cliente. */
    const historialLimpio = (historial || [])
      .filter((h) => h && (h.role === 'user' || h.role === 'assistant'))
      .map((h) => ({
        role: h.role,
        content: String(h.content || '').slice(0, 4000)
      }))
      .filter((h) => h.content.length > 0)
      .slice(-20); // últimos 20 turnos para acotar tokens

    const { texto, accionesEjecutadas } = await asistenteIaService.procesarMensaje(
      historialLimpio,
      mensaje.trim()
    );

    const nuevoHistorial = [
      ...historialLimpio,
      { role: 'user', content: mensaje.trim() },
      { role: 'assistant', content: texto }
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
  const configurado = !!process.env.GROQ_API_KEY;
  res.json({
    success: true,
    data: {
      configurado,
      proveedor: 'groq',
      modelo: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      nivel: 'lectura'
    }
  });
};

/**
 * GET /api/asistente-ia/pendientes
 *
 * Resumen de pendientes del usuario al iniciar sesión.
 * Disponible para admin/contadora/jefe_operaciones (la ruta ya filtra el rol).
 */
const pendientes = async (req, res) => {
  try {
    const resumen = await asistenteIaService.obtenerResumenPendientes(req.usuario);
    res.json({
      success: true,
      data: resumen
    });
  } catch (err) {
    console.error('[asistenteIaController] Error en pendientes:', err);
    res.status(500).json({
      success: false,
      mensaje: err.message || 'Error obteniendo el resumen de pendientes.'
    });
  }
};

module.exports = {
  enviarMensaje,
  estado,
  pendientes
};
