/**
 * Identidad visual y remitente por módulo del Portal Prayaga Interno.
 * Cada aviso usa marca, colores y pie acordes al contenido enviado.
 */
const MODULOS_EMAIL = {
  portal: {
    from: 'Portal Prayaga Interno',
    marca: 'Portal Prayaga Interno',
    pie: 'Mensaje automático del Portal Prayaga Interno — PRAYAGA Solutions SAC',
    gradient: 'linear-gradient(135deg, #0d9488, #0891b2)',
    accent: '#0d9488',
    etiqueta: 'PRAYAGA Solutions'
  },
  vacaciones: {
    from: 'Portal Prayaga — Vacaciones',
    marca: 'Vacaciones',
    pie: 'Mensaje automático del módulo Vacaciones — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)',
    accent: '#0d9488',
    etiqueta: 'Vacaciones'
  },
  permisos: {
    from: 'Portal Prayaga — Permisos y descansos',
    marca: 'Permisos y descansos',
    pie: 'Mensaje automático del módulo Permisos — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #b45309, #f59e0b)',
    accent: '#d97706',
    etiqueta: 'Permisos'
  },
  registro: {
    from: 'Portal Prayaga — Acceso al portal',
    marca: 'Solicitudes de registro',
    pie: 'Mensaje automático de alta de usuarios — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    accent: '#4f46e5',
    etiqueta: 'Registro de usuarios'
  },
  cuenta: {
    from: 'Portal Prayaga Interno',
    marca: 'Recuperar contraseña',
    pie: 'Mensaje automático de seguridad — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    accent: '#475569',
    etiqueta: 'Cuenta de usuario'
  },
  reintegro: {
    from: 'Portal Prayaga — Reintegros',
    marca: 'Solicitud de reintegro',
    pie: 'Mensaje automático del módulo Reintegros — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    accent: '#0284c7',
    etiqueta: 'Reintegros'
  },
  rendicion: {
    from: 'Portal Prayaga — Rendición de presupuesto',
    marca: 'Rendición de presupuesto',
    pie: 'Mensaje automático del módulo Rendición de presupuesto — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    accent: '#7c3aed',
    etiqueta: 'Rendiciones'
  },
  cajaChica: {
    from: 'Portal Prayaga — Caja chica',
    marca: 'Caja chica',
    pie: 'Mensaje automático del módulo Caja chica — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #059669, #34d399)',
    accent: '#059669',
    etiqueta: 'Caja chica'
  },
  bolsaHoras: {
    from: 'Portal Prayaga — Bolsa de horas',
    marca: 'Bolsa de horas',
    pie: 'Mensaje automático del módulo Bolsa de horas — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
    accent: '#6d28d9',
    etiqueta: 'Control de proyectos'
  },
  boletas: {
    from: 'Portal Prayaga — Boletas de pago',
    marca: 'Boletas de pago',
    pie: 'Mensaje automático del módulo Boletas de pago — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    accent: '#7c3aed',
    etiqueta: 'Boletas de pago'
  },
  archivo: {
    from: 'Portal Prayaga — Archivo y respaldos',
    marca: 'Archivo / Respaldos',
    pie: 'Respaldo automático off-site — Portal Prayaga Interno',
    gradient: 'linear-gradient(135deg, #334155, #475569)',
    accent: '#334155',
    etiqueta: 'Respaldos'
  }
};

function remitente(modulo = 'portal') {
  const m = MODULOS_EMAIL[modulo] || MODULOS_EMAIL.portal;
  const user = process.env.SMTP_USER || 'noreply@prayaga.biz';
  return `"${m.from}" <${user}>`;
}

/**
 * @param {string} contenido - HTML del cuerpo
 * @param {string} titulo - Subtítulo bajo la marca (ej. "Nueva solicitud de vacaciones")
 * @param {string} [modulo] - Clave en MODULOS_EMAIL
 * @param {{ marca?: string, pie?: string }} [overrides]
 */
function plantillaEmail(contenido, titulo, modulo = 'portal', overrides = {}) {
  const m = MODULOS_EMAIL[modulo] || MODULOS_EMAIL.portal;
  const marca = overrides.marca || m.marca;
  const pie = overrides.pie || m.pie;
  const gradient = m.gradient;
  const accent = m.accent;
  const etiqueta = m.etiqueta;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #334155;
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
      background: #f8fafc;
    }
    .wrap {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: ${gradient};
      color: white;
      padding: 24px 20px;
      text-align: center;
    }
    .header .etiqueta {
      margin: 0 0 4px 0;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.9;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }
    .header .subtitulo {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.95;
      font-weight: 500;
    }
    .content {
      background: #ffffff;
      padding: 24px 22px;
    }
    .info-box {
      background: #f8fafc;
      border-left: 4px solid ${accent};
      padding: 14px 16px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-row {
      margin: 6px 0;
      font-size: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      display: inline-block;
      min-width: 140px;
    }
    .info-value {
      color: #1e293b;
    }
    .button {
      display: inline-block;
      background: ${accent};
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      margin: 16px 0;
      font-weight: 600;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 18px 16px;
      color: #64748b;
      font-size: 11px;
      background: #f1f5f9;
      border-top: 1px solid #e2e8f0;
    }
    .status-pendiente { color: #d97706; font-weight: 700; }
    .status-aprobada { color: #059669; font-weight: 700; }
    .status-rechazada { color: #dc2626; font-weight: 700; }
    .status-observada { color: #2563eb; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <p class="etiqueta">${etiqueta}</p>
      <h1>${marca}</h1>
      <p class="subtitulo">${titulo}</p>
    </div>
    <div class="content">
      ${contenido}
    </div>
    <div class="footer">
      <p>${pie}</p>
      <p style="margin-top:6px;">Por favor no responda a este correo.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  MODULOS_EMAIL,
  remitente,
  plantillaEmail
};
