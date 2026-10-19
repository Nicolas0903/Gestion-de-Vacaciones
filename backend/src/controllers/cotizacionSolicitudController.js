const CotizacionSolicitud = require('../models/CotizacionSolicitud');
const Cotizacion = require('../models/Cotizacion');
const { notificarNuevaSolicitudCotizacion } = require('../services/emailService');

exports.listarResponsables = async (req, res) => {
  try {
    const rows = await Cotizacion.listarResponsables();
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: e.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const equipo = req.query.equipo === '1';
    const rows = await CotizacionSolicitud.listar({
      solicitanteId: equipo ? null : req.usuario.id,
      soloPendientesEquipo: equipo
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: e.message });
  }
};

exports.obtener = async (req, res) => {
  try {
    const row = await CotizacionSolicitud.obtener(req.params.id);
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrada' });
    const esEquipo = await puedeVerComoEquipo(req);
    if (!esEquipo && row.solicitante_id !== req.usuario.id) {
      return res.status(403).json({ success: false, mensaje: 'Sin acceso' });
    }
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, mensaje: e.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const row = await CotizacionSolicitud.crear(req.usuario.id, req.body);
    if (row.estado === 'enviada') {
      await notificarNuevaSolicitudCotizacion(row).catch(() => {});
    }
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, mensaje: e.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const prev = await CotizacionSolicitud.buscarPorId(req.params.id);
    const esEquipo = await puedeVerComoEquipo(req);
    const row = await CotizacionSolicitud.actualizar(req.params.id, req.usuario.id, req.body, {
      esEquipoCot: esEquipo
    });
    if (prev?.estado === 'borrador' && row.estado === 'enviada') {
      await notificarNuevaSolicitudCotizacion(row).catch(() => {});
    }
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(400).json({ success: false, mensaje: e.message });
  }
};

exports.crearCotizacionDesdeSolicitud = async (req, res) => {
  try {
    const esEquipo = await puedeVerComoEquipo(req);
    if (!esEquipo) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso para elaborar cotizaciones' });
    }
    const sol = await CotizacionSolicitud.obtener(req.params.id);
    if (!sol) return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada' });
    if (sol.cotizacion_id) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe una cotización vinculada' });
    }

    const responsableId =
      sol.responsable_id ||
      (await Cotizacion.listarResponsables())[0]?.id ||
      req.usuario.id;

    const detalle = await Cotizacion.crear(req.usuario.id, {
      general: {
        nombre_proyecto: sol.nombre_proyecto,
        cliente: sol.cliente,
        tipo_proyecto: sol.tipo_proyecto,
        tipo_proyecto_codigo: sol.tipo_proyecto_codigo,
        responsable_ids: [responsableId],
        responsable_id: responsableId,
        notas_internas: `[Desde ${sol.codigo}] ${sol.contexto_comercial || ''}`.trim()
      }
    });

    await CotizacionSolicitud.vincularCotizacion(sol.id, detalle.cotizacion.id);
    const solActualizada = await CotizacionSolicitud.obtener(sol.id);
    res.status(201).json({ success: true, data: { solicitud: solActualizada, cotizacion: detalle } });
  } catch (e) {
    res.status(400).json({ success: false, mensaje: e.message });
  }
};

async function puedeVerComoEquipo(req) {
  const { Empleado } = require('../models');
  const { tieneAccesoEfectivoModulo } = require('../utils/portalAcceso');
  const empleado = await Empleado.buscarPorId(req.usuario.id);
  return empleado && tieneAccesoEfectivoModulo(empleado, 'cotizaciones');
}
