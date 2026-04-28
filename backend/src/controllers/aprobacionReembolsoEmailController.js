const TokenReembolso = require('../models/TokenReembolso');
const { Empleado, Reembolso } = require('../models');
const emailService = require('../services/emailService');
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
  <title>${titulo} - Reembolsos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0e7490, #0369a1);
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
      background: #0284c7;
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rechazar reembolso</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0e7490, #0369a1);
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
    <h1>Rechazar solicitud de reembolso</h1>
    <p class="subtitle">${tokenData.empleado_nombres} ${tokenData.empleado_apellidos}</p>
    <form method="GET" action="${API_URL}/aprobacion-reembolso-email/rechazar/${token}">
      <label for="motivo">Motivo (requerido):</label>
      <textarea name="motivo" id="motivo" required placeholder="Motivo del rechazo..."></textarea>
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

async function verificarAprobadorToken(tokenData) {
  const oficial = await Empleado.obtenerAprobadorReembolsos();
  if (!oficial || tokenData.aprobador_id !== oficial.id) {
    return null;
  }
  return Empleado.buscarPorId(tokenData.aprobador_id);
}

const aprobarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenData = await TokenReembolso.buscar(token);

    if (!tokenData || tokenData.accion !== 'aprobar') {
      return res.send(generarHtmlRespuesta(
        'Enlace no válido',
        'Este enlace ya fue utilizado o ha expirado.',
        'error'
      ));
    }

    const aprobador = await verificarAprobadorToken(tokenData);
    if (!aprobador) {
      return res.send(generarHtmlRespuesta('No autorizado', 'Este enlace no es válido.', 'error'));
    }

    const r = await Reembolso.buscarPorId(tokenData.reembolso_id);
    if (!r || r.estado !== 'pendiente') {
      await TokenReembolso.invalidarTodosReembolso(tokenData.reembolso_id);
      return res.send(generarHtmlRespuesta(
        'Ya procesada',
        'Esta solicitud ya fue aprobada o rechazada.',
        'warning'
      ));
    }

    await Reembolso.aprobar(r.id, aprobador.id, 'Aprobado vía correo');
    await TokenReembolso.invalidarTodosReembolso(r.id);

    const empleado = await Empleado.buscarPorId(r.empleado_id);
    const codigo = Reembolso.codigoTicket(r);
    emailService.notificarReembolsoResueltoEmpleado(r, empleado, 'aprobado', aprobador, null)
      .catch((err) => console.error('Email reembolso:', err));

    return res.send(generarHtmlRespuesta(
      'Reembolso aprobado',
      `Has aprobado la solicitud ${codigo}. Se notificó al colaborador.`,
      'success'
    ));
  } catch (error) {
    console.error('aprobarPorToken reembolso:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

const rechazarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { motivo } = req.query;

    const tokenData = await TokenReembolso.buscar(token);

    if (!tokenData || tokenData.accion !== 'rechazar') {
      return res.send(generarHtmlRespuesta(
        'Enlace no válido',
        'Este enlace ya fue utilizado o ha expirado.',
        'error'
      ));
    }

    const aprobador = await verificarAprobadorToken(tokenData);
    if (!aprobador) {
      return res.send(generarHtmlRespuesta('No autorizado', 'Este enlace no es válido.', 'error'));
    }

    const r = await Reembolso.buscarPorId(tokenData.reembolso_id);
    if (!r || r.estado !== 'pendiente') {
      if (tokenData.reembolso_id) {
        await TokenReembolso.invalidarTodosReembolso(tokenData.reembolso_id);
      }
      return res.send(generarHtmlRespuesta(
        'Ya procesada',
        'Esta solicitud ya fue aprobada o rechazada.',
        'warning'
      ));
    }

    if (!motivo) {
      return res.send(generarFormularioRechazo(token, tokenData));
    }

    await Reembolso.rechazar(r.id, aprobador.id, motivo);
    await TokenReembolso.invalidarTodosReembolso(r.id);

    const empleado = await Empleado.buscarPorId(r.empleado_id);
    const codigo = Reembolso.codigoTicket(r);
    emailService.notificarReembolsoResueltoEmpleado(r, empleado, 'rechazado', aprobador, motivo)
      .catch((err) => console.error('Email reembolso:', err));

    return res.send(generarHtmlRespuesta(
      'Reembolso rechazado',
      `Has rechazado la solicitud ${codigo}. Se notificó al colaborador.`,
      'warning'
    ));
  } catch (error) {
    console.error('rechazarPorToken reembolso:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

module.exports = { aprobarPorToken, rechazarPorToken };
