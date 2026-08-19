const TokenActividadAprobacion = require('../models/TokenActividadAprobacion');
const bolsaHorasAprobacionService = require('../services/bolsaHorasAprobacionService');
const { getPortalBaseUrl } = require('../config/frontendPublic');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

function generarHtmlRespuesta(titulo, mensaje, tipo) {
  const portalUrl = `${getPortalBaseUrl()}/portal`;
  const colores = {
    success: { bg: '#10b981', icon: '✓' },
    error: { bg: '#ef4444', icon: '✗' },
    warning: { bg: '#f59e0b', icon: '!' }
  };
  const config = colores[tipo] || colores.warning;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo} - Bolsa de horas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 450px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${config.bg};
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    h1 { color: #1e293b; margin-bottom: 15px; font-size: 24px; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 25px; }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: white;
      padding: 12px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${config.icon}</div>
    <h1>${titulo}</h1>
    <p>${mensaje}</p>
    <a href="${portalUrl}" class="btn">Ir al portal</a>
  </div>
</body>
</html>
  `;
}

function generarFormularioRechazo(token, tokenData) {
  const portalUrl = `${getPortalBaseUrl()}/portal`;
  const consultor = tokenData.consultor_nombre || 'Consultor';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rechazar actividad</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { color: #1e293b; margin-bottom: 10px; font-size: 22px; text-align: center; }
    .subtitle { color: #64748b; text-align: center; margin-bottom: 25px; }
    label { display: block; color: #374151; font-weight: 500; margin-bottom: 8px; }
    textarea {
      width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;
      font-size: 14px; min-height: 100px; font-family: inherit;
    }
    .buttons { display: flex; gap: 10px; margin-top: 20px; }
    .btn {
      flex: 1; padding: 12px 20px; border-radius: 8px; border: none;
      font-size: 14px; font-weight: 500; cursor: pointer; text-align: center; text-decoration: none;
    }
    .btn-cancel { background: #f3f4f6; color: #374151; }
    .btn-reject { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Rechazar registro de horas</h1>
    <p class="subtitle">${consultor} — ${tokenData.proyecto_nombre || ''}</p>
    <form method="GET" action="${API_URL}/aprobacion-actividad-email/rechazar/${token}">
      <label for="motivo">Comentario (opcional):</label>
      <textarea name="motivo" id="motivo" placeholder="Motivo del rechazo..."></textarea>
      <div class="buttons">
        <a href="${portalUrl}" class="btn btn-cancel">Cancelar</a>
        <button type="submit" class="btn btn-reject">Confirmar rechazo</button>
      </div>
    </form>
  </div>
</body>
</html>
  `;
}

const aprobarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenData = await TokenActividadAprobacion.buscar(token);

    if (!tokenData || tokenData.accion !== 'aprobar') {
      return res.send(
        generarHtmlRespuesta('Enlace no válido', 'Este enlace ya fue utilizado o ha expirado.', 'error')
      );
    }

    if (tokenData.estado_aprobacion !== 'pendiente') {
      await TokenActividadAprobacion.invalidarPorActividad(tokenData.actividad_id);
      return res.send(
        generarHtmlRespuesta(
          'Ya procesada',
          'Esta actividad ya fue aprobada o rechazada.',
          'warning'
        )
      );
    }

    const r = await bolsaHorasAprobacionService.aprobarActividad(
      tokenData.actividad_id,
      tokenData.aprobador_empleado_id
    );
    if (!r.ok) {
      return res.send(generarHtmlRespuesta('No autorizado', r.mensaje || 'Acción no permitida.', 'error'));
    }

    await TokenActividadAprobacion.marcarUsado(token);

    return res.send(
      generarHtmlRespuesta(
        'Actividad aprobada',
        `Has aprobado el registro #${tokenData.actividad_id} de ${tokenData.consultor_nombre || 'consultor'}.`,
        'success'
      )
    );
  } catch (error) {
    console.error('aprobarPorToken actividad:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

const rechazarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { motivo } = req.query;

    const tokenData = await TokenActividadAprobacion.buscar(token);

    if (!tokenData || tokenData.accion !== 'rechazar') {
      return res.send(
        generarHtmlRespuesta('Enlace no válido', 'Este enlace ya fue utilizado o ha expirado.', 'error')
      );
    }

    if (tokenData.estado_aprobacion !== 'pendiente') {
      if (tokenData.actividad_id) {
        await TokenActividadAprobacion.invalidarPorActividad(tokenData.actividad_id);
      }
      return res.send(
        generarHtmlRespuesta(
          'Ya procesada',
          'Esta actividad ya fue aprobada o rechazada.',
          'warning'
        )
      );
    }

    if (motivo === undefined) {
      return res.send(generarFormularioRechazo(token, tokenData));
    }

    const r = await bolsaHorasAprobacionService.rechazarActividad(
      tokenData.actividad_id,
      tokenData.aprobador_empleado_id,
      motivo
    );
    if (!r.ok) {
      return res.send(generarHtmlRespuesta('No autorizado', r.mensaje || 'Acción no permitida.', 'error'));
    }

    await TokenActividadAprobacion.marcarUsado(token);

    return res.send(
      generarHtmlRespuesta(
        'Actividad rechazada',
        `Has rechazado el registro #${tokenData.actividad_id}. El locador podrá corregir y reenviar.`,
        'warning'
      )
    );
  } catch (error) {
    console.error('rechazarPorToken actividad:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

module.exports = { aprobarPorToken, rechazarPorToken };
