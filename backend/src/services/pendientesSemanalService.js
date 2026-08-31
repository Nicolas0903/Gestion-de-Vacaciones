const { Empleado } = require('../models');
const emailService = require('./emailService');
const {
  obtenerPendientesDetallados,
  cargarContextoGlobal
} = require('./pendientesUsuarioService');

/**
 * Recorre empleados activos y envía correo de pendientes a quienes tengan ítems.
 * @param {{ soloEmpleadoId?: number, forzar?: boolean }} opciones
 */
async function ejecutarResumenPendientesSemanal(opciones = {}) {
  const { soloEmpleadoId, forzar = false } = opciones;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📬 Resumen pendientes semanal omitido: email no configurado.');
    return { enviados: 0, omitidos: 0, sinPendientes: 0, error: 'email_no_configurado' };
  }

  const contexto = await cargarContextoGlobal();
  let empleados = [];

  if (soloEmpleadoId) {
    const emp = await Empleado.buscarPorId(soloEmpleadoId);
    if (emp?.activo) empleados = [emp];
  } else {
    empleados = await Empleado.listarTodos({ activo: 1 });
  }

  let enviados = 0;
  let omitidos = 0;
  let sinPendientes = 0;

  const ahora = new Date();
  const fechaHumana = ahora.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  for (const emp of empleados) {
    const email = String(emp.email || '').trim();
    if (!email) {
      omitidos += 1;
      continue;
    }

    try {
      const resumen = await obtenerPendientesDetallados(emp, contexto);
      if (!forzar && resumen.total <= 0) {
        sinPendientes += 1;
        continue;
      }

      const ok = await emailService.notificarResumenPendientesSemanal({
        destinatarioEmail: email,
        destinatarioNombre: `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || resumen.primerNombre,
        primerNombre: resumen.primerNombre,
        fechaHumana,
        categorias: resumen.categorias,
        total: resumen.total
      });

      if (ok) {
        enviados += 1;
        console.log(`📬 Resumen pendientes → ${email} (${resumen.total} ítem(s))`);
      } else {
        omitidos += 1;
        console.warn(`📬 Resumen pendientes: no se pudo enviar → ${email}`);
      }
    } catch (err) {
      omitidos += 1;
      console.error(`📬 Resumen pendientes error (${email}):`, err.message || err);
    }
  }

  return { enviados, omitidos, sinPendientes };
}

module.exports = {
  ejecutarResumenPendientesSemanal
};
