const Proveedor = require('../models/Proveedor');
const EvaluacionProveedor = require('../models/EvaluacionProveedor');
const ReevaluacionProveedor = require('../models/ReevaluacionProveedor');
const ProveedorSolicitudPendiente = require('../models/ProveedorSolicitudPendiente');
const {
  TIPOS_PROVEEDOR,
  AREAS_SOLICITANTE,
  PUNTAJE_CRITERIO_OPCIONES,
  CRITERIOS_SELECCION_REEVAL,
  CONFORMIDAD_REEVAL,
  calcularPuntajeReeval,
  calcularResultadoReeval
} = require('../constants/proveedoresCatalogos');

function enriquecerProveedor(p) {
  if (!p) return null;
  const tipo = TIPOS_PROVEEDOR.find((t) => t.value === p.tipo_proveedor);
  const area = AREAS_SOLICITANTE.find((a) => a.value === p.area_solicitante);
  return {
    ...p,
    tipo_label:
      p.tipo_proveedor === 'otros' && p.tipo_proveedor_otro
        ? p.tipo_proveedor_otro
        : tipo?.label || p.tipo_proveedor,
    area_label:
      p.area_solicitante === 'otros' && p.area_otro ? p.area_otro : area?.label || p.area_solicitante
  };
}

const catalogos = (req, res) => {
  res.json({
    success: true,
    data: {
      tipos_proveedor: TIPOS_PROVEEDOR,
      areas_solicitante: AREAS_SOLICITANTE,
      puntaje_criterio_opciones: PUNTAJE_CRITERIO_OPCIONES,
      cumplimiento_legal: [
        { value: 'si', label: 'Sí' },
        { value: 'no', label: 'No' },
        { value: 'na', label: 'N.A' }
      ],
      criterios_seleccion_reeval: CRITERIOS_SELECCION_REEVAL,
      conformidad_reeval: CONFORMIDAD_REEVAL,
      puntaje_habido_opciones: [10, 0],
      puntaje_precio_mercado_opciones: [5, 0]
    }
  });
};

const listarProveedores = async (req, res) => {
  try {
    const rows = await Proveedor.listar({ q: req.query.q, tipo_proveedor: req.query.tipo });
    res.json({ success: true, data: rows.map(enriquecerProveedor) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar proveedores.' });
  }
};

const obtenerProveedor = async (req, res) => {
  try {
    const p = await Proveedor.buscarPorId(parseInt(req.params.id, 10));
    if (!p || !p.activo) {
      return res.status(404).json({ success: false, mensaje: 'Proveedor no encontrado.' });
    }
    res.json({ success: true, data: enriquecerProveedor(p) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener proveedor.' });
  }
};

const crearProveedor = async (req, res) => {
  try {
    const id = await Proveedor.crear(req.body);
    const p = await Proveedor.buscarPorId(id);
    res.status(201).json({ success: true, data: enriquecerProveedor(p) });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear.' });
  }
};

const actualizarProveedor = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await Proveedor.actualizar(id, req.body);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'Proveedor no encontrado.' });
    const p = await Proveedor.buscarPorId(id);
    res.json({ success: true, data: enriquecerProveedor(p) });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar.' });
  }
};

const eliminarProveedor = async (req, res) => {
  try {
    const ok = await Proveedor.eliminar(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ success: false, mensaje: 'Proveedor no encontrado.' });
    res.json({ success: true, mensaje: 'Proveedor eliminado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar.' });
  }
};

const listarEvaluaciones = async (req, res) => {
  try {
    const rows = await EvaluacionProveedor.listar();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar evaluaciones.' });
  }
};

const obtenerEvaluacion = async (req, res) => {
  try {
    const det = await EvaluacionProveedor.obtenerDetalle(parseInt(req.params.id, 10));
    if (!det) return res.status(404).json({ success: false, mensaje: 'No encontrada.' });
    res.json({ success: true, data: det });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cargar evaluación.' });
  }
};

const crearEvaluacion = async (req, res) => {
  try {
    const id = await EvaluacionProveedor.crear(req.body, req.usuario?.id);
    const det = await EvaluacionProveedor.obtenerDetalle(id);
    res.status(201).json({ success: true, data: det });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear evaluación.' });
  }
};

const actualizarEvaluacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await EvaluacionProveedor.actualizar(id, req.body);
    const det = await EvaluacionProveedor.obtenerDetalle(id);
    res.json({ success: true, data: det });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar.' });
  }
};

const eliminarEvaluacion = async (req, res) => {
  try {
    const ok = await EvaluacionProveedor.eliminar(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ success: false, mensaje: 'No encontrada.' });
    res.json({ success: true, mensaje: 'Evaluación eliminada.' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al eliminar.' });
  }
};

const registrarGanador = async (req, res) => {
  try {
    const evaluacionId = parseInt(req.params.id, 10);
    const candidatoId = parseInt(req.body.candidato_id, 10);
    if (!candidatoId) {
      return res.status(400).json({ success: false, mensaje: 'candidato_id requerido.' });
    }
    const solicitud = await ProveedorSolicitudPendiente.buscarPorEvaluacionId(evaluacionId);
    const body = { ...req.body };
    if (solicitud?.ruc && !body.ruc) {
      body.ruc = solicitud.ruc;
    }
    const result = await EvaluacionProveedor.registrarGanadorEnLista(
      evaluacionId,
      candidatoId,
      body
    );
    if (solicitud) {
      await ProveedorSolicitudPendiente.marcarCompletadaPorEvaluacion(
        evaluacionId,
        result.proveedorId
      );
    }
    const p = await Proveedor.buscarPorId(result.proveedorId);
    res.status(201).json({
      success: true,
      mensaje: 'Proveedor registrado en la lista.',
      data: { proveedor: enriquecerProveedor(p), candidato: result.candidato }
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al registrar ganador.' });
  }
};

const listarSolicitudesPendientes = async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente';
    const rows = await ProveedorSolicitudPendiente.listar({ estado });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar solicitudes.' });
  }
};

const iniciarEvaluacionDesdeSolicitud = async (req, res) => {
  try {
    const solicitudId = parseInt(req.params.id, 10);
    const solicitud = await ProveedorSolicitudPendiente.buscarPorId(solicitudId);
    if (!solicitud) {
      return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada.' });
    }
    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Esta solicitud ya fue procesada o está en evaluación.'
      });
    }

    const evaluacionId = await EvaluacionProveedor.crear(
      {
        fecha: new Date().toISOString().slice(0, 10),
        oc_asociada: 'no',
        detalle: solicitud.detalle,
        candidatos: [
          {
            razon_social: `Proveedor RUC ${solicitud.ruc}`,
            direccion: '',
            cumplimiento_legal: 'na',
            puntaje_experiencia: 20,
            puntaje_precio: 20,
            puntaje_iso: 10,
            puntaje_valor_agregado: 5,
            obs_experiencia: 'Completar tras identificar al proveedor.',
            obs_precio: '',
            obs_iso: '',
            obs_valor_agregado: ''
          }
        ]
      },
      req.usuario?.id
    );

    await ProveedorSolicitudPendiente.marcarEnEvaluacion(solicitudId, evaluacionId);
    const det = await EvaluacionProveedor.obtenerDetalle(evaluacionId);
    res.status(201).json({
      success: true,
      mensaje: 'Evaluación iniciada desde solicitud pendiente.',
      data: { evaluacion: det, solicitud_id: solicitudId }
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al iniciar evaluación.' });
  }
};

const buscarProveedorPorRuc = async (req, res) => {
  try {
    const ruc = String(req.params.ruc || '').replace(/\D/g, '');
    if (!ruc) {
      return res.status(400).json({ success: false, mensaje: 'Indique un RUC.' });
    }
    const p = await Proveedor.buscarPorRuc(ruc);
    if (!p) {
      return res.status(404).json({ success: false, mensaje: 'Proveedor no encontrado.' });
    }
    res.json({ success: true, data: enriquecerProveedor(p) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al buscar proveedor.' });
  }
};

const listarReevaluaciones = async (req, res) => {
  try {
    const rows = await ReevaluacionProveedor.listar({
      q: req.query.q,
      proveedor_id: req.query.proveedor_id
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar reevaluaciones.' });
  }
};

const obtenerReevaluacion = async (req, res) => {
  try {
    const row = await ReevaluacionProveedor.buscarPorId(parseInt(req.params.id, 10));
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrada.' });
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al obtener reevaluación.' });
  }
};

const crearReevaluacion = async (req, res) => {
  try {
    const id = await ReevaluacionProveedor.crear(req.body, req.usuario?.id);
    const row = await ReevaluacionProveedor.buscarPorId(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al crear.' });
  }
};

const actualizarReevaluacion = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await ReevaluacionProveedor.actualizar(id, req.body);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'No encontrada.' });
    const row = await ReevaluacionProveedor.buscarPorId(id);
    res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(400).json({ success: false, mensaje: e.message || 'Error al actualizar.' });
  }
};

const eliminarReevaluacion = async (req, res) => {
  try {
    const ok = await ReevaluacionProveedor.eliminar(parseInt(req.params.id, 10));
    if (!ok) return res.status(404).json({ success: false, mensaje: 'No encontrada.' });
    res.json({ success: true, mensaje: 'Reevaluación eliminada.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar.' });
  }
};

const previewResultadoReeval = (req, res) => {
  const puntaje = calcularPuntajeReeval(req.body);
  const resultado = calcularResultadoReeval(puntaje);
  res.json({ success: true, data: { puntaje, resultado } });
};

module.exports = {
  catalogos,
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  listarEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion,
  actualizarEvaluacion,
  eliminarEvaluacion,
  registrarGanador,
  listarSolicitudesPendientes,
  iniciarEvaluacionDesdeSolicitud,
  buscarProveedorPorRuc,
  listarReevaluaciones,
  obtenerReevaluacion,
  crearReevaluacion,
  actualizarReevaluacion,
  eliminarReevaluacion,
  previewResultadoReeval
};
