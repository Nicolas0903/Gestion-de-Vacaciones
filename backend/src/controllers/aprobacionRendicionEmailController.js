const TokenRendicionPresupuesto = require('../models/TokenRendicionPresupuesto');
const { Empleado, RendicionPresupuesto } = require('../models');
const emailService = require('../services/emailService');
const { getPortalBaseUrl } = require('../config/frontendPublic');
const { aprobacionEmailsConfigurados } = require('../constants/rendicionPresupuestoNotificaciones');

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
  <title>${titulo} - Rendición</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0e7490, #0369a1);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .card {
      background: white; border-radius: 16px; padding: 40px;
      max-width: 450px; width: 100%; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      width: 80px; height: 80px; border-radius: 50%;
      background: ${config.bg}; color: white; font-size: 40px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    h1 { color: #1e293b; margin-bottom: 15px; font-size: 24px; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 25px; }
    .btn {
      display: inline-block; background: #0284c7; color: white;
      padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 500;
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
</html>`;
}

function generarFormularioRechazo(token, tokenData) {
  const portalUrl = `${getPortalBaseUrl()}/portal`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rechazar rendición</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0e7490, #0369a1);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .card {
      background: white; border-radius: 16px; padding: 40px;
      max-width: 500px; width: 100%;
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
    <h1>Rechazar rendición de presupuesto</h1>
    <p class="subtitle">${tokenData.empleado_nombres} ${tokenData.empleado_apellidos}</p>
    <form method="GET" action="${API_URL}/aprobacion-rendicion-email/rechazar/${token}">
      <label for="motivo">Motivo (requerido):</label>
      <textarea name="motivo" id="motivo" required placeholder="Motivo del rechazo..."></textarea>
      <div class="buttons">
        <a href="${portalUrl}" class="btn btn-cancel">Cancelar</a>
        <button type="submit" class="btn btn-reject">Confirmar rechazo</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

/**
 * Verifica que el `aprobador_id` del token siga habilitado (Magali o Verónica)
 * o sea admin (fallback).
 */
async function verificarAprobadorToken(tokenData) {
  const e = await Empleado.buscarPorId(tokenData.aprobador_id);
  if (!e || !e.activo) return null;
  const emailNorm = (e.email || '').toLowerCase().trim();
  const oficiales = aprobacionEmailsConfigurados();
  if (oficiales.includes(emailNorm)) return e;
  if (e.rol_nombre === 'admin') return e;
  return null;
}

const aprobarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenData = await TokenRendicionPresupuesto.buscar(token);

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

    const r = await RendicionPresupuesto.buscarPorId(tokenData.rendicion_id);
    if (!r || r.estado !== 'pendiente') {
      await TokenRendicionPresupuesto.invalidarTodos(tokenData.rendicion_id);
      return res.send(generarHtmlRespuesta(
        'Ya procesada',
        'Esta rendición ya fue aprobada o rechazada.',
        'warning'
      ));
    }

    await RendicionPresupuesto.aprobar(r.id, aprobador.id, 'Aprobada vía correo');
    await TokenRendicionPresupuesto.invalidarTodos(r.id);

    const empleado = await Empleado.buscarPorId(r.empleado_id);
    const codigo = RendicionPresupuesto.codigoTicket(r);
    emailService.notificarRendicionResueltaEmpleado(r, empleado, 'aprobado', aprobador, null)
      .catch((err) => console.error('Email rendición:', err));

    return res.send(generarHtmlRespuesta(
      'Rendición aprobada',
      `Has aprobado la rendición ${codigo}. Se notificó al colaborador.`,
      'success'
    ));
  } catch (error) {
    console.error('aprobarPorToken rendición:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

const rechazarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { motivo } = req.query;

    const tokenData = await TokenRendicionPresupuesto.buscar(token);

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

    const r = await RendicionPresupuesto.buscarPorId(tokenData.rendicion_id);
    if (!r || r.estado !== 'pendiente') {
      if (tokenData.rendicion_id) {
        await TokenRendicionPresupuesto.invalidarTodos(tokenData.rendicion_id);
      }
      return res.send(generarHtmlRespuesta(
        'Ya procesada',
        'Esta rendición ya fue aprobada o rechazada.',
        'warning'
      ));
    }

    if (!motivo) {
      return res.send(generarFormularioRechazo(token, tokenData));
    }

    await RendicionPresupuesto.rechazar(r.id, aprobador.id, motivo);
    await TokenRendicionPresupuesto.invalidarTodos(r.id);

    const empleado = await Empleado.buscarPorId(r.empleado_id);
    const codigo = RendicionPresupuesto.codigoTicket(r);
    emailService.notificarRendicionResueltaEmpleado(r, empleado, 'rechazado', aprobador, motivo)
      .catch((err) => console.error('Email rendición:', err));

    return res.send(generarHtmlRespuesta(
      'Rendición rechazada',
      `Has rechazado la rendición ${codigo}. Se notificó al colaborador.`,
      'warning'
    ));
  } catch (error) {
    console.error('rechazarPorToken rendición:', error);
    return res.send(generarHtmlRespuesta('Error', 'No se pudo completar la acción.', 'error'));
  }
};

module.exports = { aprobarPorToken, rechazarPorToken };
