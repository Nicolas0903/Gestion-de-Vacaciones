const TokenAprobacion = require('../models/TokenAprobacion');
const { SolicitudVacaciones, PeriodoVacaciones, Aprobacion, Notificacion, Empleado } = require('../models');
const emailService = require('../services/emailService');

// Aprobar solicitud mediante token (desde correo)
const aprobarPorToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Buscar token válido
    const tokenData = await TokenAprobacion.buscar(token);
    
    if (!tokenData) {
      return res.send(generarHtmlRespuesta(
        'Token Inválido o Expirado',
        'Este enlace ya fue utilizado o ha expirado. Por favor ingresa al sistema para gestionar las solicitudes.',
        'error'
      ));
    }

    // Verificar que la solicitud esté en estado pendiente
    const solicitud = await SolicitudVacaciones.buscarPorId(tokenData.solicitud_id);
    if (!solicitud || (solicitud.estado !== 'pendiente_jefe' && solicitud.estado !== 'pendiente_contadora')) {
      await TokenAprobacion.marcarUsado(token);
      return res.send(generarHtmlRespuesta(
        'Solicitud Ya Procesada',
        'Esta solicitud ya fue aprobada o rechazada anteriormente.',
        'warning'
      ));
    }

    // Determinar tipo de aprobación según estado actual
    let tipoAprobacion;
    let siguienteEstado;
    const aprobador = await Empleado.buscarPorId(tokenData.aprobador_id);
    const esContadoraOAdmin = aprobador.rol_nombre === 'admin' || aprobador.rol_nombre === 'contadora';

    if (solicitud.estado === 'pendiente_jefe') {
      if (esContadoraOAdmin) {
        tipoAprobacion = 'contadora';
        siguienteEstado = 'aprobada';
        // Aprobar también como jefe si existe
        const aprobacionJefe = await Aprobacion.obtenerPendientePorTipo(solicitud.id, 'jefe');
        if (aprobacionJefe) {
          await Aprobacion.aprobar(aprobacionJefe.id, 'Aprobado por ' + aprobador.nombres + ' via email');
        }
      } else {
        tipoAprobacion = 'jefe';
        siguienteEstado = 'pendiente_contadora';
      }
    } else if (solicitud.estado === 'pendiente_contadora') {
      tipoAprobacion = 'contadora';
      siguienteEstado = 'aprobada';
    }

    // Procesar aprobación
    const aprobacion = await Aprobacion.obtenerPendientePorTipo(solicitud.id, tipoAprobacion);
    if (aprobacion) {
      await Aprobacion.aprobar(aprobacion.id, 'Aprobado via email por ' + aprobador.nombres);
    } else {
      const nuevaAprobacionId = await Aprobacion.crear({
        solicitud_id: solicitud.id,
        aprobador_id: tokenData.aprobador_id,
        tipo_aprobacion: tipoAprobacion
      });
      await Aprobacion.aprobar(nuevaAprobacionId, 'Aprobado via email por ' + aprobador.nombres);
    }

    // Actualizar estado de solicitud
    await SolicitudVacaciones.actualizarEstado(solicitud.id, siguienteEstado);

    // Marcar token como usado
    await TokenAprobacion.marcarUsado(token);

    // Obtener datos del empleado
    const empleadoSolicitud = await Empleado.buscarPorId(solicitud.empleado_id);

    // Notificaciones y emails según el flujo
    if (tipoAprobacion === 'jefe' && !esContadoraOAdmin) {
      // Buscar contadora para siguiente aprobación
      const contadoras = await Empleado.obtenerPorRol('contadora');
      if (contadoras.length > 0) {
        await Aprobacion.crear({
          solicitud_id: solicitud.id,
          aprobador_id: contadoras[0].id,
          tipo_aprobacion: 'contadora'
        });
        await Notificacion.notificarAprobacionJefe(solicitud.id, solicitud.empleado_id, contadoras[0].id);
        
        // Enviar email a contadora con botones
        const solicitudActualizada = await SolicitudVacaciones.buscarPorId(solicitud.id);
        emailService.notificarAprobacionJefeConBotones(solicitudActualizada, empleadoSolicitud, aprobador, contadoras[0])
          .catch(err => console.error('Error enviando email:', err));
      }
    }

    if (siguienteEstado === 'aprobada') {
      await PeriodoVacaciones.actualizarDiasGozados(solicitud.periodo_id, solicitud.dias_solicitados);
      await Notificacion.notificarAprobacionFinal(solicitud.id, solicitud.empleado_id);
      
      emailService.notificarAprobacionFinal(solicitud, empleadoSolicitud, aprobador)
        .catch(err => console.error('Error enviando email:', err));
    }

    return res.send(generarHtmlRespuesta(
      '¡Solicitud Aprobada!',
      `Has aprobado la solicitud de vacaciones de ${tokenData.empleado_nombres} ${tokenData.empleado_apellidos}. Se ha notificado al empleado.`,
      'success'
    ));

  } catch (error) {
    console.error('Error al aprobar por token:', error);
    return res.send(generarHtmlRespuesta(
      'Error',
      'Ocurrió un error al procesar la aprobación. Por favor intenta de nuevo o ingresa al sistema.',
      'error'
    ));
  }
};

// Rechazar solicitud mediante token (desde correo)
const rechazarPorToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { motivo } = req.query;

    // Buscar token válido
    const tokenData = await TokenAprobacion.buscar(token);
    
    if (!tokenData) {
      return res.send(generarHtmlRespuesta(
        'Token Inválido o Expirado',
        'Este enlace ya fue utilizado o ha expirado. Por favor ingresa al sistema para gestionar las solicitudes.',
        'error'
      ));
    }

    // Verificar que la solicitud esté en estado pendiente
    const solicitud = await SolicitudVacaciones.buscarPorId(tokenData.solicitud_id);
    if (!solicitud || (solicitud.estado !== 'pendiente_jefe' && solicitud.estado !== 'pendiente_contadora')) {
      await TokenAprobacion.marcarUsado(token);
      return res.send(generarHtmlRespuesta(
        'Solicitud Ya Procesada',
        'Esta solicitud ya fue aprobada o rechazada anteriormente.',
        'warning'
      ));
    }

    // Si no hay motivo, mostrar formulario
    if (!motivo) {
      return res.send(generarFormularioRechazo(token, tokenData));
    }

    // Determinar tipo de aprobación según estado
    let tipoAprobacion;
    if (solicitud.estado === 'pendiente_jefe') {
      tipoAprobacion = 'jefe';
    } else if (solicitud.estado === 'pendiente_contadora') {
      tipoAprobacion = 'contadora';
    }

    // Procesar rechazo
    const aprobacion = await Aprobacion.obtenerPendientePorTipo(solicitud.id, tipoAprobacion);
    if (aprobacion) {
      await Aprobacion.rechazar(aprobacion.id, motivo);
    }

    // Actualizar estado
    await SolicitudVacaciones.actualizarEstado(solicitud.id, 'rechazada');

    // Marcar token como usado
    await TokenAprobacion.marcarUsado(token);

    // Notificar al empleado
    await Notificacion.notificarRechazo(solicitud.id, solicitud.empleado_id, motivo);

    // Enviar email de rechazo
    const empleadoSolicitud = await Empleado.buscarPorId(solicitud.empleado_id);
    const rechazadoPor = await Empleado.buscarPorId(tokenData.aprobador_id);
    emailService.notificarRechazo(solicitud, empleadoSolicitud, rechazadoPor, motivo)
      .catch(err => console.error('Error enviando email:', err));

    return res.send(generarHtmlRespuesta(
      'Solicitud Rechazada',
      `Has rechazado la solicitud de vacaciones de ${tokenData.empleado_nombres} ${tokenData.empleado_apellidos}. Se ha notificado al empleado.`,
      'warning'
    ));

  } catch (error) {
    console.error('Error al rechazar por token:', error);
    return res.send(generarHtmlRespuesta(
      'Error',
      'Ocurrió un error al procesar el rechazo. Por favor intenta de nuevo o ingresa al sistema.',
      'error'
    ));
  }
};

// Generar página HTML de respuesta
function generarHtmlRespuesta(titulo, mensaje, tipo) {
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
  <title>${titulo} - Gestión de Vacaciones</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
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
    h1 {
      color: #1e293b;
      margin-bottom: 15px;
      font-size: 24px;
    }
    p {
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    .btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 30px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: background 0.3s;
    }
    .btn:hover { background: #2563eb; }
    .logo { margin-bottom: 20px; font-size: 40px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🏖️</div>
    <div class="icon">${config.icon}</div>
    <h1>${titulo}</h1>
    <p>${mensaje}</p>
    <a href="https://gestion.prayaga.biz/vacaciones/aprobaciones" class="btn">Ir al Sistema</a>
  </div>
</body>
</html>
  `;
}

// Generar formulario de rechazo
function generarFormularioRechazo(token, tokenData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rechazar Solicitud - Gestión de Vacaciones</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
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
    .logo { text-align: center; font-size: 40px; margin-bottom: 10px; }
    h1 {
      color: #1e293b;
      margin-bottom: 10px;
      font-size: 22px;
      text-align: center;
    }
    .subtitle {
      color: #64748b;
      text-align: center;
      margin-bottom: 25px;
    }
    .info-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .info-box p { color: #991b1b; margin: 5px 0; }
    label {
      display: block;
      color: #374151;
      font-weight: 500;
      margin-bottom: 8px;
    }
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      resize: vertical;
      min-height: 100px;
      font-family: inherit;
    }
    textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 12px 20px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    .btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }
    .btn-reject {
      background: #ef4444;
      color: white;
    }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🏖️</div>
    <h1>Rechazar Solicitud</h1>
    <p class="subtitle">Solicitud de ${tokenData.empleado_nombres} ${tokenData.empleado_apellidos}</p>
    
    <div class="info-box">
      <p><strong>⚠️ Esta acción no se puede deshacer</strong></p>
      <p>El empleado será notificado del rechazo.</p>
    </div>
    
    <form method="GET" action="/api/aprobacion-email/rechazar/${token}">
      <label for="motivo">Motivo del rechazo (requerido):</label>
      <textarea name="motivo" id="motivo" required placeholder="Explica brevemente el motivo del rechazo..."></textarea>
      
      <div class="buttons">
        <a href="https://gestion.prayaga.biz/vacaciones/aprobaciones" class="btn btn-cancel">Cancelar</a>
        <button type="submit" class="btn btn-reject">Confirmar Rechazo</button>
      </div>
    </form>
  </div>
</body>
</html>
  `;
}

module.exports = {
  aprobarPorToken,
  rechazarPorToken
};
