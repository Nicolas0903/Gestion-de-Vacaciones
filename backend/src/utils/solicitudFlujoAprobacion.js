const TokenAprobacion = require('../models/TokenAprobacion');
const { SolicitudVacaciones, Aprobacion, Notificacion, Empleado } = require('../models');
const emailService = require('../services/emailService');

/**
 * Inicia (o reinicia) el flujo de aprobación jefe + contadora.
 * Usado al enviar por primera vez y al apelar una solicitud rechazada.
 */
async function iniciarFlujoAprobacion({
  solicitudId,
  solicitud,
  empleado,
  esApelacion = false,
  motivoApelacion = null
}) {
  await TokenAprobacion.invalidarPorSolicitud(solicitudId);

  const emailOpts = { esApelacion, motivoApelacion };

  if (empleado.jefe_id) {
    await SolicitudVacaciones.actualizarEstado(solicitudId, 'pendiente_jefe');

    await Aprobacion.crear({
      solicitud_id: solicitudId,
      aprobador_id: empleado.jefe_id,
      tipo_aprobacion: 'jefe'
    });

    const contadoras = await Empleado.obtenerPorRol('contadora');
    const contadora = contadoras[0];
    if (contadora) {
      await Aprobacion.crear({
        solicitud_id: solicitudId,
        aprobador_id: contadora.id,
        tipo_aprobacion: 'contadora'
      });
    }

    if (esApelacion) {
      await Notificacion.notificarApelacionARevisar(solicitudId, empleado.jefe_id);
      if (contadora) {
        await Notificacion.notificarApelacionARevisar(solicitudId, contadora.id);
      }
    } else {
      await Notificacion.notificarSolicitudEnviada(solicitudId, empleado.id, empleado.jefe_id);
      if (contadora) {
        await Notificacion.notificarSolicitudEnviadaContadora(solicitudId, contadora.id);
      }
    }

    const jefe = await Empleado.buscarPorId(empleado.jefe_id);
    if (jefe) {
      emailService
        .notificarNuevaSolicitud(solicitud, empleado, jefe, emailOpts)
        .catch((err) => console.error('Error enviando email:', err));
    }
    if (contadora) {
      emailService
        .notificarNuevaSolicitud(solicitud, empleado, contadora, emailOpts)
        .catch((err) => console.error('Error enviando email:', err));
    }
  } else {
    await SolicitudVacaciones.actualizarEstado(solicitudId, 'pendiente_contadora');

    const contadoras = await Empleado.obtenerPorRol('contadora');
    if (contadoras.length > 0) {
      await Aprobacion.crear({
        solicitud_id: solicitudId,
        aprobador_id: contadoras[0].id,
        tipo_aprobacion: 'contadora'
      });

      if (esApelacion) {
        await Notificacion.notificarApelacionARevisar(solicitudId, contadoras[0].id);
      } else {
        await Notificacion.notificarSolicitudEnviada(solicitudId, empleado.id, contadoras[0].id);
      }

      emailService
        .notificarNuevaSolicitud(solicitud, empleado, contadoras[0], emailOpts)
        .catch((err) => console.error('Error enviando email:', err));
    }
  }
}

module.exports = { iniciarFlujoAprobacion };
