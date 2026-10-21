const SolicitudPresupuesto = require('../models/SolicitudPresupuesto');
const { Empleado } = require('../models');
const RendicionPresupuesto = require('../models/RendicionPresupuesto');
const emailService = require('../services/emailService');
const { notificacionRegistroEmailsConfigurados } = require('../constants/rendicionPresupuestoNotificaciones');

function esStaffAprobacion(usuario) {
  if (!usuario) return false;
  if (usuario.rol_nombre === 'admin') return true;
  const email = (usuario.email || '').toLowerCase().trim();
  const { aprobacionEmailsConfigurados } = require('../constants/rendicionPresupuestoNotificaciones');
  return aprobacionEmailsConfigurados().includes(email);
}

async function enriquecerLista(rows) {
  const out = [];
  for (const row of rows) {
    const usado = await SolicitudPresupuesto.montoComprometido(row.id);
    const tope = Number(row.monto_aprobado ?? row.monto_solicitado);
    out.push(
      SolicitudPresupuesto.enriquecer(row, {
        monto_comprometido: usado,
        monto_saldo: Math.max(0, tope - usado),
        monto_tope: tope
      })
    );
  }
  return out;
}

const listarMias = async (req, res) => {
  try {
    const rows = await SolicitudPresupuesto.listarPorEmpleado(req.usuario.id);
    res.json({ success: true, data: await enriquecerLista(rows) });
  } catch (e) {
    console.error('listarMias solicitud presupuesto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar solicitudes.' });
  }
};

const listarAprobadasParaRendicion = async (req, res) => {
  try {
    const data = await SolicitudPresupuesto.listarAprobadasParaRendicion(req.usuario.id);
    res.json({ success: true, data });
  } catch (e) {
    console.error('listarAprobadasParaRendicion:', e);
    res.status(500).json({ success: false, mensaje: 'Error al cargar presupuestos aprobados.' });
  }
};

const listarPendientes = async (req, res) => {
  try {
    if (!esStaffAprobacion(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'No autorizado.' });
    }
    const rows = await SolicitudPresupuesto.listarPendientesAprobacion();
    res.json({ success: true, data: await enriquecerLista(rows) });
  } catch (e) {
    console.error('listarPendientes solicitud presupuesto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al listar pendientes.' });
  }
};

const crear = async (req, res) => {
  try {
    const { area, concepto, justificacion, monto_solicitado, moneda, enviar } = req.body;
    if (!area || !RendicionPresupuesto.AREAS_VALIDAS.includes(area)) {
      return res.status(400).json({ success: false, mensaje: 'Indique un área válida.' });
    }
    const conceptoT = String(concepto || '').trim();
    if (!conceptoT) {
      return res.status(400).json({ success: false, mensaje: 'Indique el concepto del presupuesto.' });
    }
    const monto = parseFloat(monto_solicitado);
    if (Number.isNaN(monto) || monto <= 0) {
      return res.status(400).json({ success: false, mensaje: 'Indique un monto solicitado mayor a cero.' });
    }
    if (enviar && !String(justificacion || '').trim()) {
      return res.status(400).json({ success: false, mensaje: 'La justificación es obligatoria al enviar.' });
    }

    const id = await SolicitudPresupuesto.crear(req.usuario.id, {
      area,
      concepto: conceptoT,
      justificacion: String(justificacion || '').trim() || null,
      monto_solicitado: monto,
      moneda,
      estado: enviar ? 'pendiente' : 'borrador'
    });

    const row = await SolicitudPresupuesto.buscarPorId(id);
    if (enviar) {
      await notificarEnvio(row, req.usuario);
    }

    res.status(201).json({
      success: true,
      mensaje: enviar
        ? 'Solicitud enviada. Magali o el equipo autorizado revisará la aprobación.'
        : 'Borrador guardado.',
      data: SolicitudPresupuesto.enriquecer(row)
    });
  } catch (e) {
    console.error('crear solicitud presupuesto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al crear solicitud.' });
  }
};

const actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const actual = await SolicitudPresupuesto.buscarPorId(id);
    if (!actual || actual.empleado_id !== req.usuario.id) {
      return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada.' });
    }
    if (!['borrador', 'pendiente'].includes(actual.estado)) {
      return res.status(400).json({ success: false, mensaje: 'No se puede editar en este estado.' });
    }

    const { enviar } = req.body;
    const patch = {
      area: req.body.area,
      concepto: req.body.concepto != null ? String(req.body.concepto).trim() : undefined,
      justificacion:
        req.body.justificacion != null ? String(req.body.justificacion).trim() : undefined,
      monto_solicitado:
        req.body.monto_solicitado != null ? parseFloat(req.body.monto_solicitado) : undefined,
      moneda: req.body.moneda
    };

    if (enviar) {
      const justificacion = patch.justificacion ?? actual.justificacion ?? '';
      if (!String(justificacion).trim()) {
        return res.status(400).json({ success: false, mensaje: 'Justificación obligatoria al enviar.' });
      }
      patch.estado = 'pendiente';
    }

    await SolicitudPresupuesto.actualizar(id, req.usuario.id, patch);
    const row = await SolicitudPresupuesto.buscarPorId(id);
    if (enviar && actual.estado === 'borrador') {
      await notificarEnvio(row, req.usuario);
    }

    res.json({
      success: true,
      data: SolicitudPresupuesto.enriquecer(row),
      mensaje: enviar ? 'Solicitud enviada a aprobación.' : 'Actualizado.'
    });
  } catch (e) {
    console.error('actualizar solicitud presupuesto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al actualizar.' });
  }
};

const cancelar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = await SolicitudPresupuesto.cancelar(id, req.usuario.id);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo cancelar.' });
    }
    res.json({ success: true, mensaje: 'Solicitud cancelada.' });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al cancelar.' });
  }
};

const aprobar = async (req, res) => {
  try {
    if (!esStaffAprobacion(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'No autorizado.' });
    }
    const id = Number(req.params.id);
    const sp = await SolicitudPresupuesto.buscarPorId(id);
    if (!sp || sp.estado !== 'pendiente') {
      return res.status(400).json({ success: false, mensaje: 'Solicitud no pendiente.' });
    }
    let montoAprobado = parseFloat(req.body.monto_aprobado);
    if (Number.isNaN(montoAprobado) || montoAprobado <= 0) {
      montoAprobado = Number(sp.monto_solicitado);
    }
    const ok = await SolicitudPresupuesto.resolver(id, {
      aprobada: true,
      aprobadorId: req.usuario.id,
      monto_aprobado: montoAprobado,
      comentarios: req.body.comentarios || null
    });
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo aprobar.' });
    }
    const row = await SolicitudPresupuesto.buscarPorId(id);
    res.json({
      success: true,
      mensaje: 'Presupuesto aprobado. El solicitante puede registrar rendiciones vinculadas.',
      data: SolicitudPresupuesto.enriquecer(row)
    });
  } catch (e) {
    console.error('aprobar solicitud presupuesto:', e);
    res.status(500).json({ success: false, mensaje: 'Error al aprobar.' });
  }
};

const rechazar = async (req, res) => {
  try {
    if (!esStaffAprobacion(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'No autorizado.' });
    }
    const id = Number(req.params.id);
    const comentarios = String(req.body.comentarios || '').trim();
    if (!comentarios) {
      return res.status(400).json({ success: false, mensaje: 'Indique el motivo de rechazo.' });
    }
    const ok = await SolicitudPresupuesto.resolver(id, {
      aprobada: false,
      aprobadorId: req.usuario.id,
      monto_aprobado: null,
      comentarios
    });
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo rechazar.' });
    }
    res.json({ success: true, mensaje: 'Solicitud rechazada.' });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: 'Error al rechazar.' });
  }
};

async function notificarEnvio(solicitud, solicitante) {
  try {
    const data = SolicitudPresupuesto.enriquecer(solicitud);
    const aprobadores = await Empleado.obtenerAprobadoresRendicion();
    const portalUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkGestion = `${portalUrl}/rendicion-presupuesto/gestion`;

    for (const a of aprobadores) {
      if (a.email) {
        await emailService.notificarSolicitudPresupuestoPendiente({
          solicitud: data,
          solicitante,
          destinatario: a,
          linkPortal: linkGestion
        });
      }
    }
    for (const email of notificacionRegistroEmailsConfigurados()) {
      const ya = aprobadores.some((x) => (x.email || '').toLowerCase() === email);
      if (ya) continue;
      await emailService.notificarSolicitudPresupuestoCopia({
        solicitud: data,
        solicitante,
        destinatarioEmail: email,
        linkPortal: linkGestion
      });
    }
  } catch (err) {
    console.error('notificarEnvio solicitud presupuesto:', err);
  }
}

module.exports = {
  listarMias,
  listarAprobadasParaRendicion,
  listarPendientes,
  crear,
  actualizar,
  cancelar,
  aprobar,
  rechazar,
  esStaffAprobacion
};
