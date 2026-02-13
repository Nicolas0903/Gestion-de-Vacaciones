const nodemailer = require('nodemailer');
const TokenAprobacion = require('../models/TokenAprobacion');

// URL base para los enlaces de aprobación
const API_URL = process.env.API_URL || 'https://gestion.prayaga.biz/api';

// Configuración del transporter para Outlook/Office 365
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true para 465, false para otros puertos (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
};

// Verificar conexión al iniciar
const verificarConexion = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Servicio de email configurado correctamente');
    return true;
  } catch (error) {
    console.warn('⚠️ Email no configurado:', error.message);
    return false;
  }
};

// Plantilla base HTML para emails
const plantillaBase = (contenido, titulo) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f8fafc;
      padding: 25px;
      border: 1px solid #e2e8f0;
      border-top: none;
    }
    .info-box {
      background: white;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 15px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-row {
      display: flex;
      margin: 8px 0;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 150px;
    }
    .info-value {
      color: #1e293b;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 12px;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background: #f1f5f9;
    }
    .status-pendiente { color: #f59e0b; font-weight: bold; }
    .status-aprobada { color: #10b981; font-weight: bold; }
    .status-rechazada { color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏖️ Gestión de Vacaciones</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${titulo}</p>
  </div>
  <div class="content">
    ${contenido}
  </div>
  <div class="footer">
    <p>Este es un mensaje automático del Sistema de Gestión de Vacaciones - Prayaga</p>
    <p>Por favor no responda a este correo.</p>
  </div>
</body>
</html>
`;

// Formatear fecha
const formatearFecha = (fecha) => {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-PE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ==================== FUNCIONES DE ENVÍO ====================

/**
 * Enviar correo cuando un empleado envía una solicitud de vacaciones
 * CON BOTONES DE APROBAR/RECHAZAR
 * @param {Object} solicitud - Datos de la solicitud
 * @param {Object} empleado - Datos del empleado que solicita
 * @param {Object} aprobador - Datos del aprobador (jefe o contadora)
 */
const notificarNuevaSolicitud = async (solicitud, empleado, aprobador) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de nueva solicitud omitida');
    return false;
  }

  try {
    // Generar tokens para aprobar/rechazar
    const tokenAprobar = await TokenAprobacion.crear(solicitud.id, aprobador.id, 'aprobar');
    const tokenRechazar = await TokenAprobacion.crear(solicitud.id, aprobador.id, 'rechazar');

    const urlAprobar = `${API_URL}/aprobacion-email/aprobar/${tokenAprobar}`;
    const urlRechazar = `${API_URL}/aprobacion-email/rechazar/${tokenRechazar}`;

    // Soporte para ambos formatos: nombres/apellidos o nombre/apellido
    const aprobadorNombre = aprobador.nombres || aprobador.nombre;
    const aprobadorApellido = aprobador.apellidos || aprobador.apellido;
    const empleadoNombre = empleado.nombres || empleado.nombre;
    const empleadoApellido = empleado.apellidos || empleado.apellido;

    const contenido = `
      <p>Hola <strong>${aprobadorNombre} ${aprobadorApellido}</strong>,</p>
      
      <p>Se ha recibido una nueva solicitud de vacaciones que requiere tu aprobación:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Solicitante:</span>
          <span class="info-value">${empleadoNombre} ${empleadoApellido}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cargo:</span>
          <span class="info-value">${empleado.cargo || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Inicio:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Fin:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Días Solicitados:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        ${solicitud.observaciones ? `
        <div class="info-row">
          <span class="info-label">Observaciones:</span>
          <span class="info-value">${solicitud.observaciones}</span>
        </div>
        ` : ''}
      </div>
      
      <p style="text-align: center; margin: 25px 0 10px 0;"><strong>¿Qué deseas hacer con esta solicitud?</strong></p>
      
      <center>
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 10px;">
              <a href="${urlAprobar}" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✓ APROBAR
              </a>
            </td>
            <td style="padding: 0 10px;">
              <a href="${urlRechazar}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✗ RECHAZAR
              </a>
            </td>
          </tr>
        </table>
      </center>
      
      <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #64748b;">
        O también puedes <a href="${process.env.FRONTEND_URL || 'https://gestion.prayaga.biz'}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
      </p>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: aprobador.email,
      subject: `📋 Nueva Solicitud de Vacaciones - ${empleadoNombre} ${empleadoApellido}`,
      html: plantillaBase(contenido, 'Nueva Solicitud de Vacaciones')
    });
    console.log(`📧 Email enviado a ${aprobador.email} - Nueva solicitud de ${empleadoNombre}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    return false;
  }
};

/**
 * Notificar al empleado que su solicitud fue aprobada por el jefe
 * y notificar a la contadora que tiene una nueva solicitud pendiente (CON BOTONES)
 */
const notificarAprobacionJefe = async (solicitud, empleado, jefe, contadora) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de aprobación jefe omitida');
    return false;
  }

  try {
    const transporter = createTransporter();

    // Generar tokens para la contadora
    const tokenAprobar = await TokenAprobacion.crear(solicitud.id, contadora.id, 'aprobar');
    const tokenRechazar = await TokenAprobacion.crear(solicitud.id, contadora.id, 'rechazar');

    const urlAprobar = `${API_URL}/aprobacion-email/aprobar/${tokenAprobar}`;
    const urlRechazar = `${API_URL}/aprobacion-email/rechazar/${tokenRechazar}`;

    // Soporte para ambos formatos
    const empleadoNombre = empleado.nombres || empleado.nombre;
    const empleadoApellido = empleado.apellidos || empleado.apellido;
    const jefeNombre = jefe.nombres || jefe.nombre;
    const jefeApellido = jefe.apellidos || jefe.apellido;
    const contadoraNombre = contadora.nombres || contadora.nombre;
    const contadoraApellido = contadora.apellidos || contadora.apellido;

    // 1. Notificar al empleado
    const contenidoEmpleado = `
      <p>Hola <strong>${empleadoNombre} ${empleadoApellido}</strong>,</p>
      
      <p>Tu solicitud de vacaciones ha sido <span class="status-pendiente">aprobada por tu jefe directo</span> 
      y está pendiente de aprobación final.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Fecha Inicio:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Fin:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Días:</span>
          <span class="info-value">${solicitud.dias_solicitados} días</span>
        </div>
        <div class="info-row">
          <span class="info-label">Aprobado por:</span>
          <span class="info-value">${jefeNombre} ${jefeApellido}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estado:</span>
          <span class="info-value status-pendiente">Pendiente aprobación final</span>
        </div>
      </div>
      
      <p>Te notificaremos cuando se complete el proceso de aprobación.</p>
    `;

    // 2. Notificar a la contadora con botones
    const contenidoContadora = `
      <p>Hola <strong>${contadoraNombre} ${contadoraApellido}</strong>,</p>
      
      <p>Una solicitud de vacaciones ha sido aprobada por el jefe directo y requiere tu <strong>aprobación final</strong>:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Solicitante:</span>
          <span class="info-value">${empleadoNombre} ${empleadoApellido}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cargo:</span>
          <span class="info-value">${empleado.cargo || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Inicio:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Fin:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Días:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Aprobado por:</span>
          <span class="info-value">${jefeNombre} ${jefeApellido} (Jefe Directo)</span>
        </div>
      </div>
      
      <p style="text-align: center; margin: 25px 0 10px 0;"><strong>¿Qué deseas hacer con esta solicitud?</strong></p>
      
      <center>
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 10px;">
              <a href="${urlAprobar}" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✓ APROBAR
              </a>
            </td>
            <td style="padding: 0 10px;">
              <a href="${urlRechazar}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✗ RECHAZAR
              </a>
            </td>
          </tr>
        </table>
      </center>
      
      <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #64748b;">
        O también puedes <a href="${process.env.FRONTEND_URL || 'https://gestion.prayaga.biz'}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
      </p>
    `;

    // Enviar ambos correos
    await Promise.all([
      transporter.sendMail({
        from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
        to: empleado.email,
        subject: `✅ Tu solicitud fue aprobada por tu jefe - Pendiente aprobación final`,
        html: plantillaBase(contenidoEmpleado, 'Solicitud Aprobada por Jefe')
      }),
      transporter.sendMail({
        from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
        to: contadora.email,
        subject: `📋 Solicitud Pendiente de Aprobación Final - ${empleadoNombre} ${empleadoApellido}`,
        html: plantillaBase(contenidoContadora, 'Solicitud Pendiente de Aprobación')
      })
    ]);
    console.log(`📧 Emails enviados - Aprobación jefe de ${empleadoNombre}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar emails:', error.message);
    return false;
  }
};

/**
 * Notificar a la contadora cuando el jefe aprueba (usado desde aprobación por email)
 * CON BOTONES DE APROBAR/RECHAZAR
 */
const notificarAprobacionJefeConBotones = async (solicitud, empleado, jefe, contadora) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación omitida');
    return false;
  }

  try {
    // Generar tokens para la contadora
    const tokenAprobar = await TokenAprobacion.crear(solicitud.id, contadora.id, 'aprobar');
    const tokenRechazar = await TokenAprobacion.crear(solicitud.id, contadora.id, 'rechazar');

    const urlAprobar = `${API_URL}/aprobacion-email/aprobar/${tokenAprobar}`;
    const urlRechazar = `${API_URL}/aprobacion-email/rechazar/${tokenRechazar}`;

    const contenido = `
      <p>Hola <strong>${contadora.nombres || contadora.nombre} ${contadora.apellidos || contadora.apellido}</strong>,</p>
      
      <p>Una solicitud de vacaciones ha sido aprobada por el jefe directo y requiere tu <strong>aprobación final</strong>:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Solicitante:</span>
          <span class="info-value">${empleado.nombres || empleado.nombre} ${empleado.apellidos || empleado.apellido}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cargo:</span>
          <span class="info-value">${empleado.cargo || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Inicio:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fecha Fin:</span>
          <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Días:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Aprobado por:</span>
          <span class="info-value">${jefe.nombres || jefe.nombre} ${jefe.apellidos || jefe.apellido} (Jefe Directo)</span>
        </div>
      </div>
      
      <p style="text-align: center; margin: 25px 0 10px 0;"><strong>¿Qué deseas hacer con esta solicitud?</strong></p>
      
      <center>
        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 10px;">
              <a href="${urlAprobar}" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✓ APROBAR
              </a>
            </td>
            <td style="padding: 0 10px;">
              <a href="${urlRechazar}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ✗ RECHAZAR
              </a>
            </td>
          </tr>
        </table>
      </center>
      
      <p style="text-align: center; margin-top: 20px; font-size: 13px; color: #64748b;">
        O también puedes <a href="${process.env.FRONTEND_URL || 'https://gestion.prayaga.biz'}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
      </p>
    `;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: contadora.email,
      subject: `📋 Solicitud Pendiente de Aprobación Final - ${empleado.nombres || empleado.nombre} ${empleado.apellidos || empleado.apellido}`,
      html: plantillaBase(contenido, 'Solicitud Pendiente de Aprobación')
    });
    console.log(`📧 Email enviado a ${contadora.email} - Pendiente aprobación final`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    return false;
  }
};

/**
 * Notificar al empleado que su solicitud fue aprobada completamente
 */
const notificarAprobacionFinal = async (solicitud, empleado, aprobador) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de aprobación final omitida');
    return false;
  }

  // Soporte para ambos formatos
  const empleadoNombre = empleado.nombres || empleado.nombre;
  const empleadoApellido = empleado.apellidos || empleado.apellido;
  const aprobadorNombre = aprobador.nombres || aprobador.nombre;
  const aprobadorApellido = aprobador.apellidos || aprobador.apellido;

  const contenido = `
    <p>Hola <strong>${empleadoNombre} ${empleadoApellido}</strong>,</p>
    
    <p>¡Excelentes noticias! Tu solicitud de vacaciones ha sido <span class="status-aprobada">APROBADA</span>.</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Fecha Inicio:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha Fin:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Días Aprobados:</span>
        <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Salida Efectiva:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_efectiva_salida)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Regreso Efectivo:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_efectiva_regreso)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Aprobado por:</span>
        <span class="info-value">${aprobadorNombre} ${aprobadorApellido}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estado:</span>
        <span class="info-value status-aprobada">APROBADA ✓</span>
      </div>
    </div>
    
    <p>Puedes descargar tu constancia de vacaciones desde el sistema.</p>
    
    <center>
      <a href="${process.env.FRONTEND_URL || 'https://gestion.prayaga.biz'}/vacaciones/mis-solicitudes" class="button">
        Ver Mis Solicitudes
      </a>
    </center>
    
    <p style="margin-top: 20px;">¡Disfruta tus vacaciones! 🌴</p>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: empleado.email,
      subject: `🎉 ¡Vacaciones Aprobadas! - ${solicitud.dias_solicitados} días del ${formatearFecha(solicitud.fecha_inicio_vacaciones).split(',')[1]?.trim() || ''}`,
      html: plantillaBase(contenido, '¡Vacaciones Aprobadas!')
    });
    console.log(`📧 Email enviado a ${empleado.email} - Vacaciones aprobadas`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    return false;
  }
};

/**
 * Notificar al empleado que su solicitud fue rechazada
 */
const notificarRechazo = async (solicitud, empleado, rechazadoPor, motivo) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de rechazo omitida');
    return false;
  }

  // Soporte para ambos formatos
  const empleadoNombre = empleado.nombres || empleado.nombre;
  const empleadoApellido = empleado.apellidos || empleado.apellido;
  const rechazadoPorNombre = rechazadoPor.nombres || rechazadoPor.nombre;
  const rechazadoPorApellido = rechazadoPor.apellidos || rechazadoPor.apellido;

  const contenido = `
    <p>Hola <strong>${empleadoNombre} ${empleadoApellido}</strong>,</p>
    
    <p>Lamentamos informarte que tu solicitud de vacaciones ha sido <span class="status-rechazada">RECHAZADA</span>.</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Fecha Inicio:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_inicio_vacaciones)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fecha Fin:</span>
        <span class="info-value">${formatearFecha(solicitud.fecha_fin_vacaciones)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Días Solicitados:</span>
        <span class="info-value">${solicitud.dias_solicitados} días</span>
      </div>
      <div class="info-row">
        <span class="info-label">Rechazado por:</span>
        <span class="info-value">${rechazadoPorNombre} ${rechazadoPorApellido}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estado:</span>
        <span class="info-value status-rechazada">RECHAZADA ✗</span>
      </div>
    </div>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0; color: #991b1b;"><strong>Motivo del rechazo:</strong></p>
      <p style="margin: 10px 0 0 0; color: #7f1d1d;">${motivo || 'No se especificó motivo'}</p>
    </div>
    
    <p>Si tienes dudas, por favor comunícate con tu jefe directo o con Recursos Humanos.</p>
    
    <center>
      <a href="${process.env.FRONTEND_URL || 'https://gestion.prayaga.biz'}/vacaciones/nueva-solicitud" class="button">
        Crear Nueva Solicitud
      </a>
    </center>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: empleado.email,
      subject: `❌ Solicitud de Vacaciones Rechazada`,
      html: plantillaBase(contenido, 'Solicitud Rechazada')
    });
    console.log(`📧 Email enviado a ${empleado.email} - Solicitud rechazada`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error.message);
    return false;
  }
};

/**
 * Enviar email de prueba para verificar configuración
 */
const enviarEmailPrueba = async (destinatario) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Configuración de email no encontrada en variables de entorno');
  }

  const contenido = `
    <p>Este es un correo de prueba del Sistema de Gestión de Vacaciones.</p>
    <p>Si recibiste este correo, la configuración de email está funcionando correctamente.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Fecha:</span>
        <span class="info-value">${new Date().toLocaleString('es-PE')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Servidor SMTP:</span>
        <span class="info-value">${process.env.SMTP_HOST}</span>
      </div>
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: '🧪 Prueba de Configuración de Email - Gestión de Vacaciones',
    html: plantillaBase(contenido, 'Email de Prueba')
  });

  return true;
};

module.exports = {
  verificarConexion,
  notificarNuevaSolicitud,
  notificarAprobacionJefe,
  notificarAprobacionJefeConBotones,
  notificarAprobacionFinal,
  notificarRechazo,
  enviarEmailPrueba
};
