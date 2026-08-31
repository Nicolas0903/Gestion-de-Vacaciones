const emailService = require('./emailService');
const TokenActividadAprobacion = require('../models/TokenActividadAprobacion');
const {
  resolverAprobadorEmpleado,
  listarPendientesAgrupadosPorAprobador,
  aprobacionEmailEsInmediato
} = require('./bolsaHorasAprobacionService');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

function rangoSemanaReporte() {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 7);
  return {
    desde: desde.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hasta: hasta.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  };
}

/**
 * Envía el viernes un correo consolidado a cada aprobador con todas las
 * actividades de locadores pendientes de aprobación (con botones Aprobar/Rechazar).
 */
async function ejecutarReporteSemanalAprobacionesLocadores() {
  if (aprobacionEmailEsInmediato()) {
    console.log('📋 Bolsa horas aprobaciones: modo inmediato activo — reporte semanal omitido.');
    return { enviados: 0, omitidos: 0, sinPendientes: 0, modo: 'inmediato' };
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📋 Bolsa horas aprobaciones semanal omitido: email no configurado.');
    return { enviados: 0, omitidos: 0, error: 'email_no_configurado' };
  }

  const grupos = await listarPendientesAgrupadosPorAprobador();
  const entradas = [...grupos.entries()].filter(([, acts]) => acts.length > 0);

  if (!entradas.length) {
    console.log('📋 Bolsa horas: reporte semanal aprobaciones — sin pendientes.');
    return { enviados: 0, omitidos: 0, sinPendientes: 1 };
  }

  const rango = rangoSemanaReporte();
  let enviados = 0;
  let omitidos = 0;

  for (const [aprobadorEmail, actividades] of entradas) {
    const aprobador = await resolverAprobadorEmpleado(actividades[0]?.requerido_por);
    if (!aprobador?.id) {
      omitidos += 1;
      console.warn(`📋 Bolsa horas aprobaciones: sin empleado aprobador para ${aprobadorEmail}`);
      continue;
    }

    const nombre = [aprobador.nombres, aprobador.apellidos].filter(Boolean).join(' ').trim();

    const actividadesConEnlaces = [];
    for (const act of actividades) {
      await TokenActividadAprobacion.invalidarPorActividad(act.id);
      const tokenAprobar = await TokenActividadAprobacion.crear(act.id, aprobador.id, 'aprobar');
      const tokenRechazar = await TokenActividadAprobacion.crear(act.id, aprobador.id, 'rechazar');
      actividadesConEnlaces.push({
        ...act,
        urlAprobar: `${API_URL}/aprobacion-actividad-email/aprobar/${tokenAprobar}`,
        urlRechazar: `${API_URL}/aprobacion-actividad-email/rechazar/${tokenRechazar}`
      });
    }

    try {
      const ok = await emailService.enviarReporteSemanalAprobacionesBolsaHoras({
        aprobadorEmail,
        aprobadorNombre: nombre,
        actividades: actividadesConEnlaces,
        rangoDesde: rango.desde,
        rangoHasta: rango.hasta
      });

      if (ok) {
        enviados += 1;
        console.log(
          `📋 Bolsa horas: reporte aprobaciones semanal → ${aprobadorEmail} (${actividades.length} pendiente(s))`
        );
      } else {
        omitidos += 1;
      }
    } catch (err) {
      omitidos += 1;
      console.error(`📋 Bolsa horas aprobaciones semanal error (${aprobadorEmail}):`, err.message || err);
    }
  }

  return { enviados, omitidos };
}

module.exports = {
  ejecutarReporteSemanalAprobacionesLocadores
};
