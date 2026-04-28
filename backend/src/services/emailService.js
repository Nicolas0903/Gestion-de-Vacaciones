const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const TokenAprobacion = require('../models/TokenAprobacion');
const { calcularFechaEfectivaRegreso } = require('../utils/calcularDiasVacaciones');

// URL base para los enlaces de aprobación
const API_URL = process.env.API_URL || 'http://96.126.124.60:3002/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://96.126.124.60/gestion-vacaciones';

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
// tituloMarca: texto grande del encabezado (ej. vacaciones vs reintegro)
// textoPie: línea del pie (por módulo)
const plantillaBase = (contenido, titulo, tituloMarca, textoPie) => {
  const marca =
    tituloMarca != null && tituloMarca !== ''
      ? tituloMarca
      : '🏖️ Gestión de Vacaciones';
  const pie =
    textoPie != null && textoPie !== ''
      ? textoPie
      : 'Este es un mensaje automático del Sistema de Gestión de Vacaciones - Prayaga';
  return `
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
    <h1>${marca}</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${titulo}</p>
  </div>
  <div class="content">
    ${contenido}
  </div>
  <div class="footer">
    <p>${pie}</p>
    <p>Por favor no responda a este correo.</p>
  </div>
</body>
</html>
`;
};

const fechaSalidaCorreo = (solicitud) =>
  solicitud.fecha_efectiva_salida || solicitud.fecha_inicio_vacaciones;

const fechaRegresoCorreo = (solicitud) =>
  solicitud.fecha_efectiva_regreso || calcularFechaEfectivaRegreso(solicitud.fecha_fin_vacaciones);

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
          <span class="info-label">Días solicitados:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Salida efectiva:</span>
          <span class="info-value">${formatearFecha(fechaSalidaCorreo(solicitud))}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Regreso efectivo:</span>
          <span class="info-value">${formatearFecha(fechaRegresoCorreo(solicitud))}</span>
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
        O también puedes <a href="${FRONTEND_URL}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
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
          <span class="info-label">Días solicitados:</span>
          <span class="info-value">${solicitud.dias_solicitados} días</span>
        </div>
        <div class="info-row">
          <span class="info-label">Salida efectiva:</span>
          <span class="info-value">${formatearFecha(fechaSalidaCorreo(solicitud))}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Regreso efectivo:</span>
          <span class="info-value">${formatearFecha(fechaRegresoCorreo(solicitud))}</span>
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
          <span class="info-label">Días solicitados:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Salida efectiva:</span>
          <span class="info-value">${formatearFecha(fechaSalidaCorreo(solicitud))}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Regreso efectivo:</span>
          <span class="info-value">${formatearFecha(fechaRegresoCorreo(solicitud))}</span>
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
        O también puedes <a href="${FRONTEND_URL}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
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
          <span class="info-label">Días solicitados:</span>
          <span class="info-value"><strong>${solicitud.dias_solicitados} días</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Salida efectiva:</span>
          <span class="info-value">${formatearFecha(fechaSalidaCorreo(solicitud))}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Regreso efectivo:</span>
          <span class="info-value">${formatearFecha(fechaRegresoCorreo(solicitud))}</span>
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
        O también puedes <a href="${FRONTEND_URL}/vacaciones/aprobaciones">ingresar al sistema</a> para más detalles.
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
      <a href="${FRONTEND_URL}/vacaciones/mis-solicitudes" class="button">
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
      <a href="${FRONTEND_URL}/vacaciones/nueva-solicitud" class="button">
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
 * Enviar email de recuperación de contraseña
 */
const enviarRecuperacionPassword = async (empleado, token) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Recuperación de contraseña omitida');
    return false;
  }

  const urlRecuperacion = `${FRONTEND_URL}/restablecer-password/${token}`;

  const contenido = `
    <p>Hola <strong>${empleado.nombres} ${empleado.apellidos}</strong>,</p>
    
    <p>Recibimos una solicitud para restablecer tu contraseña en el Sistema de Gestión de Vacaciones.</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${empleado.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Válido hasta:</span>
        <span class="info-value">24 horas desde ahora</span>
      </div>
    </div>
    
    <p style="text-align: center; margin: 25px 0;">
      <a href="${urlRecuperacion}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        🔑 Restablecer Contraseña
      </a>
    </p>
    
    <p style="color: #64748b; font-size: 13px;">
      Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
    </p>
    
    <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
      <a href="${urlRecuperacion}" style="color: #3b82f6; word-break: break-all;">${urlRecuperacion}</a>
    </p>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: empleado.email,
      subject: '🔐 Restablecer tu contraseña - Gestión de Vacaciones',
      html: plantillaBase(contenido, 'Recuperar Contraseña')
    });
    console.log(`📧 Email de recuperación enviado a ${empleado.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email de recuperación:', error.message);
    return false;
  }
};

/**
 * Notificar a la contadora sobre nueva solicitud de registro
 */
const notificarNuevaSolicitudRegistro = async (solicitud, contadora) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de registro omitida');
    return false;
  }

  const urlGestion = `${FRONTEND_URL}/admin/solicitudes-registro`;

  const contenido = `
    <p>Hola <strong>${contadora.nombres} ${contadora.apellidos}</strong>,</p>
    
    <p>Se ha recibido una nueva <strong>solicitud de registro</strong> que requiere tu revisión:</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Nombre:</span>
        <span class="info-value">${solicitud.nombres} ${solicitud.apellidos}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${solicitud.email}</span>
      </div>
      ${solicitud.dni ? `
      <div class="info-row">
        <span class="info-label">DNI:</span>
        <span class="info-value">${solicitud.dni}</span>
      </div>
      ` : ''}
      ${solicitud.cargo_solicitado ? `
      <div class="info-row">
        <span class="info-label">Cargo Solicitado:</span>
        <span class="info-value">${solicitud.cargo_solicitado}</span>
      </div>
      ` : ''}
      ${solicitud.motivo ? `
      <div class="info-row">
        <span class="info-label">Motivo:</span>
        <span class="info-value">${solicitud.motivo}</span>
      </div>
      ` : ''}
    </div>
    
    <p style="text-align: center; margin: 25px 0;">
      <a href="${urlGestion}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📋 Revisar Solicitud
      </a>
    </p>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: contadora.email,
      subject: `📝 Nueva Solicitud de Registro - ${solicitud.nombres} ${solicitud.apellidos}`,
      html: plantillaBase(contenido, 'Nueva Solicitud de Registro')
    });
    console.log(`📧 Notificación de registro enviada a ${contadora.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar notificación de registro:', error.message);
    return false;
  }
};

/**
 * Notificar al solicitante que su registro fue aprobado
 */
const notificarRegistroAprobado = async (solicitud, passwordTemporal) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de aprobación registro omitida');
    return false;
  }

  const contenido = `
    <p>Hola <strong>${solicitud.nombres} ${solicitud.apellidos}</strong>,</p>
    
    <p>¡Buenas noticias! Tu solicitud de registro ha sido <span class="status-aprobada">APROBADA</span>.</p>
    
    <p>Ya puedes acceder al Sistema de Gestión de Vacaciones con las siguientes credenciales:</p>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${solicitud.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Contraseña temporal:</span>
        <span class="info-value"><strong>${passwordTemporal}</strong></span>
      </div>
    </div>
    
    <p style="background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; color: #92400e;">
      ⚠️ <strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.
    </p>
    
    <p style="text-align: center; margin: 25px 0;">
      <a href="${FRONTEND_URL}/login" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        🚀 Iniciar Sesión
      </a>
    </p>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: solicitud.email,
      subject: '✅ ¡Tu cuenta ha sido creada! - Gestión de Vacaciones',
      html: plantillaBase(contenido, 'Registro Aprobado')
    });
    console.log(`📧 Notificación de registro aprobado enviada a ${solicitud.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar notificación de registro aprobado:', error.message);
    return false;
  }
};

/**
 * Notificar al solicitante que su registro fue rechazado
 */
const notificarRegistroRechazado = async (solicitud, motivo) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Notificación de rechazo registro omitida');
    return false;
  }

  const contenido = `
    <p>Hola <strong>${solicitud.nombres} ${solicitud.apellidos}</strong>,</p>
    
    <p>Lamentamos informarte que tu solicitud de registro ha sido <span class="status-rechazada">RECHAZADA</span>.</p>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong></p>
      <p style="margin: 10px 0 0 0; color: #7f1d1d;">${motivo || 'No se especificó motivo'}</p>
    </div>
    
    <p>Si tienes dudas, por favor comunícate con el área de Recursos Humanos.</p>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: solicitud.email,
      subject: '❌ Solicitud de Registro Rechazada - Gestión de Vacaciones',
      html: plantillaBase(contenido, 'Registro Rechazado')
    });
    console.log(`📧 Notificación de registro rechazado enviada a ${solicitud.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar notificación de registro rechazado:', error.message);
    return false;
  }
};

const etiquetaTipoPermiso = (tipo) => {
  const map = {
    descanso_medico: 'Descanso médico',
    permiso_personal: 'Permiso personal',
    permiso_sin_goce: 'Permiso sin goce',
    otro: 'Otro'
  };
  return map[tipo] || tipo;
};

/**
 * Notificar a contaduría que hay un permiso o descanso médico pendiente de revisión
 */
const notificarPermisoPendienteContadora = async (permiso, empleado, contadora) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email no configurado - Notificacion de permiso pendiente omitida');
    return false;
  }

  const empNombre = empleado.nombres || empleado.nombre;
  const empApellido = empleado.apellidos || empleado.apellido;
  const contNombre = contadora.nombres || contadora.nombre;
  const contApellido = contadora.apellidos || contadora.apellido;
  const tipoLabel = etiquetaTipoPermiso(permiso.tipo);

  const contenido = `
    <p>Hola <strong>${contNombre} ${contApellido}</strong>,</p>
    <p><strong>${empNombre} ${empApellido}</strong> registró una solicitud pendiente de tu revisión.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Tipo:</span>
        <span class="info-value">${tipoLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Desde:</span>
        <span class="info-value">${formatearFecha(permiso.fecha_inicio)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hasta:</span>
        <span class="info-value">${formatearFecha(permiso.fecha_fin)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Días:</span>
        <span class="info-value">${permiso.dias_totales}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Motivo:</span>
        <span class="info-value">${permiso.motivo || '—'}</span>
      </div>
    </div>
    <center>
      <a href="${FRONTEND_URL}/permisos/gestion" class="button">Revisar en el sistema</a>
    </center>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Gestión de Vacaciones - Prayaga" <${process.env.SMTP_USER}>`,
      to: contadora.email,
      subject: `Nueva solicitud: ${tipoLabel} - ${empNombre} ${empApellido}`,
      html: plantillaBase(contenido, 'Permiso o descanso pendiente')
    });
    console.log(`Email enviado a ${contadora.email} - Permiso pendiente (${tipoLabel})`);
    return true;
  } catch (error) {
    console.error('Error al enviar email de permiso pendiente:', error.message);
    return false;
  }
};

/**
 * Enviar email de prueba para verificar configuración
 */
const codigoTicketReembolso = (row) => {
  const y = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
  return `RMB-${y}-${String(row.id).padStart(5, '0')}`;
};

const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const etiquetaMetodoReembolso = (m) =>
  ({ yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia bancaria' }[m] || m);

/**
 * Vista HTML del recibo (para correo cuando no hay factura adjunta).
 */
const htmlVistaReciboReembolso = (r, codigoTicket) => {
  const monto = Number(r.monto) || 0;
  const fecha = r.fecha_solicitud_usuario
    ? new Date(r.fecha_solicitud_usuario).toLocaleDateString('es-PE')
    : '—';
  const reg = r.created_at ? new Date(r.created_at).toLocaleString('es-PE') : '—';
  return `
  <div style="border:1px solid #000; padding:20px; max-width:520px; margin:16px auto; font-family:Arial,Helvetica,sans-serif; color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:12px; color:#0d9488;"><strong>PRAYAGA</strong></td>
      <td align="center" style="font-size:18px; font-weight:bold;">Recibo</td>
      <td align="right"><span style="border:1px solid #000; padding:8px 12px; display:inline-block;">S/ ${monto.toFixed(2)}</span></td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
      <td style="font-size:13px;">Recibí de Prayaga Solutions S.A.C</td>
      <td align="right" style="font-size:13px;"><strong>Fecha:</strong> ${escapeHtml(fecha)}</td>
    </tr></table>
    <p style="font-size:13px; margin-top:16px; margin-bottom:4px;"><strong>Concepto de</strong></p>
    <p style="border-bottom:1px solid #000; font-size:13px; padding-bottom:6px; min-height:24px;">${escapeHtml(r.concepto)}</p>
    <p style="text-align:right; font-size:13px; margin-top:28px;">Nombre completo: ${escapeHtml(r.nombre_completo)}</p>
    <p style="text-align:right; font-size:13px;">DNI: ${escapeHtml(r.dni)}</p>
    <p style="font-size:11px; color:#64748b; text-align:center; margin-top:24px;">
      ${escapeHtml(codigoTicket)} · Registro ticket: ${escapeHtml(reg)}
    </p>
  </div>`;
};

/** Encabezado y pie distintos al de vacaciones en plantillaBase */
const MARCA_ENCABEZADO_EMAIL_REINTEGRO = '💳 Solicitud de reintegro';
const PIE_EMAIL_REINTEGRO =
  'Este es un mensaje automático del Portal RRHH - Prayaga (solicitudes de reintegro).';

/**
 * Notificación al aprobador único (Enrique por defecto). Solo este correo recibe la solicitud para aprobar/rechazar.
 */
const notificarNuevaSolicitudReembolsoAprobador = async ({
  reembolso,
  empleado,
  aprobador,
  urlAprobar,
  urlRechazar,
  pdfReciboBuffer,
  comprobanteDiskPath,
  comprobanteNombreOriginal
}) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - Reembolso: notificación a aprobador omitida');
    return false;
  }
  if (!aprobador?.email) return false;

  const codigo = codigoTicketReembolso(reembolso);
  const empNombre = `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  const bloqueRecibo =
    !reembolso.tiene_comprobante && pdfReciboBuffer
      ? htmlVistaReciboReembolso(reembolso, codigo)
      : '<p>El solicitante adjuntó su comprobante de pago en este correo.</p>';

  const contenido = `
    <p>Hola <strong>${escapeHtml(aprobador.nombres)} ${escapeHtml(aprobador.apellidos)}</strong>,</p>
    <p>Nueva solicitud de reembolso de <strong>${escapeHtml(empNombre)}</strong>.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Ticket</span><span class="info-value">${escapeHtml(codigo)}</span></div>
      <div class="info-row"><span class="info-label">Registro</span><span class="info-value">${escapeHtml(new Date(reembolso.created_at).toLocaleString('es-PE'))}</span></div>
      <div class="info-row"><span class="info-label">Fecha (usuario)</span><span class="info-value">${escapeHtml(reembolso.fecha_solicitud_usuario)}</span></div>
      <div class="info-row"><span class="info-label">Concepto</span><span class="info-value">${escapeHtml(reembolso.concepto)}</span></div>
      <div class="info-row"><span class="info-label">Monto recibo</span><span class="info-value">S/ ${Number(reembolso.monto || 0).toFixed(2)}</span></div>
      <div class="info-row"><span class="info-label">Método</span><span class="info-value">${escapeHtml(etiquetaMetodoReembolso(reembolso.metodo_reembolso))}</span></div>
      <div class="info-row"><span class="info-label">Celular</span><span class="info-value">${escapeHtml(reembolso.celular)}</span></div>
      <div class="info-row"><span class="info-label">Nombre en método</span><span class="info-value">${escapeHtml(reembolso.nombre_en_metodo)}</span></div>
      ${reembolso.metodo_reembolso === 'transferencia' ? `<div class="info-row"><span class="info-label">Cuenta/CCI</span><span class="info-value">${escapeHtml(reembolso.numero_cuenta || '')}</span></div>` : ''}
    </div>
    ${bloqueRecibo}
    <p style="text-align:center; margin:24px 0 10px;"><strong>¿Aprobar o rechazar?</strong></p>
    <center>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="padding:0 10px;"><a href="${urlAprobar}" style="display:inline-block;background:#10b981;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">APROBAR</a></td>
        <td style="padding:0 10px;"><a href="${urlRechazar}" style="display:inline-block;background:#ef4444;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">RECHAZAR</a></td>
      </tr></table>
    </center>
  `;

  const attachments = [];
  if (pdfReciboBuffer && Buffer.isBuffer(pdfReciboBuffer)) {
    attachments.push({
      filename: `${codigo}.pdf`,
      content: pdfReciboBuffer
    });
  }
  if (comprobanteDiskPath && fs.existsSync(comprobanteDiskPath)) {
    attachments.push({
      filename: comprobanteNombreOriginal || path.basename(comprobanteDiskPath),
      path: comprobanteDiskPath
    });
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Portal RRHH - Reembolsos" <${process.env.SMTP_USER}>`,
      to: aprobador.email,
      subject: `Solicitud de reembolso ${codigo} - ${empNombre}`,
      html: plantillaBase(
        contenido,
        'Nueva solicitud de reintegro',
        MARCA_ENCABEZADO_EMAIL_REINTEGRO,
        PIE_EMAIL_REINTEGRO
      ),
      attachments
    });
    console.log(`📧 Reembolso: correo enviado a aprobador ${aprobador.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error email reembolso a aprobador:', error.message);
    return false;
  }
};

const notificarReembolsoResueltoEmpleado = async (reembolso, empleado, resultado, aprobador, detalle) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }
  const codigo = codigoTicketReembolso(reembolso);
  const nombre = `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  const aprob = `${aprobador.nombres || ''} ${aprobador.apellidos || ''}`.trim();
  const obs =
    detalle && String(detalle).trim()
      ? `<div class="info-box" style="margin-top:12px;">
      <div class="info-row"><span class="info-label">Observaciones</span><span class="info-value">${escapeHtml(String(detalle).trim())}</span></div>
    </div>`
      : '';

  let contenido;
  let subject;
  let tituloPlantilla;

  if (resultado === 'aprobado') {
    contenido = `
    <p>Hola <strong>${escapeHtml(nombre)}</strong>,</p>
    <p>Tu solicitud de reintegro <strong>${escapeHtml(codigo)}</strong> quedó en estado <span class="status-aprobada">APROBADO</span>.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Aprobado por</span><span class="info-value">${escapeHtml(aprob)}</span></div>
    </div>${obs}`;
    subject = `Reintegro aprobado · ${codigo}`;
    tituloPlantilla = 'Solicitud aprobada';
  } else if (resultado === 'observado') {
    contenido = `
    <p>Hola <strong>${escapeHtml(nombre)}</strong>,</p>
    <p>Tu solicitud de reintegro <strong>${escapeHtml(codigo)}</strong> fue marcada como <strong>observada</strong> por revisión.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px;border-radius:8px;">
      <strong>Observaciones:</strong> ${escapeHtml(detalle || '—')}
    </div>
    <div class="info-box" style="margin-top:12px;">
      <div class="info-row"><span class="info-label">Revisado por</span><span class="info-value">${escapeHtml(aprob)}</span></div>
    </div>`;
    subject = `Reintegro observado · ${codigo}`;
    tituloPlantilla = 'Solicitud observada';
  } else {
    contenido = `
    <p>Hola <strong>${escapeHtml(nombre)}</strong>,</p>
    <p>Tu solicitud de reintegro <strong>${escapeHtml(codigo)}</strong> fue <span class="status-rechazada">RECHAZADA</span>.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;">
      <strong>Motivo / observaciones:</strong> ${escapeHtml(detalle || '—')}
    </div>
    <div class="info-box" style="margin-top:12px;">
      <div class="info-row"><span class="info-label">Revisado por</span><span class="info-value">${escapeHtml(aprob)}</span></div>
    </div>`;
    subject = `Reintegro rechazado · ${codigo}`;
    tituloPlantilla = 'Solicitud rechazada';
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Portal RRHH - Reintegros" <${process.env.SMTP_USER}>`,
      to: empleado.email,
      subject,
      html: plantillaBase(
        contenido,
        tituloPlantilla,
        MARCA_ENCABEZADO_EMAIL_REINTEGRO,
        PIE_EMAIL_REINTEGRO
      )
    });
    return true;
  } catch (error) {
    console.error('❌ Error email reembolso a empleado:', error.message);
    return false;
  }
};

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
  enviarEmailPrueba,
  enviarRecuperacionPassword,
  notificarNuevaSolicitudRegistro,
  notificarRegistroAprobado,
  notificarRegistroRechazado,
  notificarPermisoPendienteContadora,
  notificarNuevaSolicitudReembolsoAprobador,
  notificarReembolsoResueltoEmpleado
};
