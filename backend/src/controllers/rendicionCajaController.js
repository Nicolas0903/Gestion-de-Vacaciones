const path = require('path');
const fs = require('fs');
const RendicionCajaPeriodo = require('../models/RendicionCajaPeriodo');
const RendicionPresupuesto = require('../models/RendicionPresupuesto');

const MESES_NOMBRE = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const ADJ_DEPOSITO_DIR = path.join(__dirname, '../../uploads/rendiciones-presupuesto/depositos');

function ultimoDiaMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

function rangoMes(anio, mes) {
  const m = String(mes).padStart(2, '0');
  const desde = `${anio}-${m}-01`;
  const dia = ultimoDiaMes(anio, mes);
  const hasta = `${anio}-${m}-${String(dia).padStart(2, '0')}`;
  return { desde, hasta };
}

function mapRendicionFila(r) {
  const codigo = RendicionPresupuesto.codigoTicket(r);
  const moneda = RendicionPresupuesto.normalizarMoneda(r.moneda);
  const montoRend = Number(r.monto) || 0;
  const montoDep =
    r.monto_deposito != null && r.monto_deposito !== '' ? Number(r.monto_deposito) : null;
  return {
    rendicion_id: r.id,
    codigo_ticket: codigo,
    fecha_documento: r.fecha_solicitud_usuario,
    area: r.area,
    area_label: RendicionPresupuesto.AREAS_LABEL[r.area] || r.area,
    empleado_nombre: `${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim(),
    concepto: r.concepto,
    moneda,
    monto_rendicion: montoRend,
    monto_rendicion_fmt: RendicionPresupuesto.formatearMonto(montoRend, moneda),
    fecha_deposito: RendicionPresupuesto.normalizarFechaDepositoApi(r.fecha_deposito),
    monto_deposito: montoDep,
    comprobante_deposito_nombre: r.comprobante_deposito_nombre || null,
    tiene_comprobante_deposito: !!(r.comprobante_deposito_path && String(r.comprobante_deposito_path).trim()),
    tiene_comprobante_solicitud: !!(r.archivo_comprobante_path && String(r.archivo_comprobante_path).trim()),
    archivo_comprobante_nombre: r.archivo_comprobante_nombre || null
  };
}

async function construirDetallePeriodo(periodo) {
  const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
  const raw = await RendicionPresupuesto.listarAprobadasPorRangoFechaDocumento(desde, hasta);
  const rendiciones = raw.map(mapRendicionFila);

  const totalRendicion = rendiciones.reduce((s, x) => s + x.monto_rendicion, 0);
  const totalDepositado = rendiciones.reduce((s, x) => s + (x.monto_deposito != null ? x.monto_deposito : 0), 0);
  const conDepositoCompleto = rendiciones.filter(
    (x) => x.fecha_deposito && x.monto_deposito != null && x.tiene_comprobante_deposito
  ).length;

  return {
    periodo,
    rendiciones,
    totales: {
      total_rendiciones: rendiciones.length,
      total_monto_rendicion: totalRendicion,
      total_monto_depositado: totalDepositado,
      rendiciones_con_deposito_registrado: conDepositoCompleto
    },
    rango_fecha_documento: { desde, hasta }
  };
}

const listarPeriodos = async (req, res) => {
  try {
    const rows = await RendicionCajaPeriodo.listarPeriodos();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar períodos.' });
  }
};

const crearPeriodo = async (req, res) => {
  try {
    const anio = parseInt(req.body.anio, 10);
    const mes = parseInt(req.body.mes, 10);
    if (!anio || mes < 1 || mes > 12) {
      return res.status(400).json({ success: false, mensaje: 'Año y mes no válidos.' });
    }
    const existe = await RendicionCajaPeriodo.buscarPeriodoPorAnioMes(anio, mes);
    if (existe) {
      return res.status(409).json({ success: false, mensaje: 'Ya existe un período para ese mes.' });
    }
    const id = await RendicionCajaPeriodo.crearPeriodo(anio, mes);
    const row = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al crear período.' });
  }
};

const detallePeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    const data = await construirDetallePeriodo(periodo);
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    const sqlMsg = e.sqlMessage || e.message || '';
    if (sqlMsg.includes('Unknown column') || e.errno === 1054) {
      return res.status(500).json({
        success: false,
        mensaje:
          'Faltan columnas de depósito en rendiciones_presupuesto. Ejecute backend/sql/alter_rendiciones_presupuesto_deposito.sql'
      });
    }
    res.status(500).json({ success: false, mensaje: 'Error al cargar el período.' });
  }
};

const guardarDepositos = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Solo se editan depósitos en borrador.' });
    }

    const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
    const aprobadas = await RendicionPresupuesto.listarAprobadasPorRangoFechaDocumento(desde, hasta);
    const idsValidos = new Set(aprobadas.map((r) => r.id));

    const filas = Array.isArray(req.body.rendiciones) ? req.body.rendiciones : [];
    for (const f of filas) {
      const rid = parseInt(f.id, 10);
      if (!idsValidos.has(rid)) {
        return res.status(400).json({
          success: false,
          mensaje: `La rendición ${rid} no pertenece a este período o no está aprobada.`
        });
      }
      await RendicionPresupuesto.actualizarDatosDeposito(rid, {
        fecha_deposito: f.fecha_deposito,
        monto_deposito: f.monto_deposito
      });
    }

    const data = await construirDetallePeriodo(periodo);
    res.json({ success: true, data: data.rendiciones });
  } catch (e) {
    console.error(e);
    const msg = e.message || 'Error al guardar depósitos.';
    res.status(400).json({ success: false, mensaje: msg });
  }
};

const cerrarPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'El período ya está cerrado.' });
    }
    const data = await construirDetallePeriodo(periodo);
    const ok = await RendicionCajaPeriodo.cerrarPeriodo(id, data.totales.total_monto_rendicion);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo cerrar el período.' });
    }
    const actualizado = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    res.json({
      success: true,
      mensaje: 'Período cerrado.',
      data: { periodo: actualizado, totales: data.totales }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cerrar período.' });
  }
};

const reabrirPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'cerrado') {
      return res.status(400).json({ success: false, mensaje: 'Solo se puede reabrir un período cerrado.' });
    }
    const ok = await RendicionCajaPeriodo.reabrirPeriodo(id);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo reabrir el período.' });
    }
    const actualizado = await RendicionCajaPeriodo.buscarPeriodoPorId(id);
    res.json({
      success: true,
      mensaje: 'Período reabierto en borrador.',
      data: { periodo: actualizado }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al reabrir período.' });
  }
};

const subirComprobanteDeposito = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const rendicionId = parseInt(req.params.rendicionId, 10);
    if (!req.file?.path) {
      return res.status(400).json({ success: false, mensaje: 'Archivo requerido.' });
    }
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(periodoId);
    if (!periodo || periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Período no editable.' });
    }
    const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
    const aprobadas = await RendicionPresupuesto.listarAprobadasPorRangoFechaDocumento(desde, hasta);
    if (!aprobadas.some((r) => r.id === rendicionId)) {
      return res.status(400).json({ success: false, mensaje: 'Rendición no pertenece a este período.' });
    }
    await RendicionPresupuesto.actualizarComprobanteDeposito(
      rendicionId,
      req.file.originalname,
      req.file.path
    );
    res.json({
      success: true,
      data: {
        rendicion_id: rendicionId,
        comprobante_deposito_nombre: req.file.originalname,
        tiene_comprobante_deposito: true
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al subir comprobante.' });
  }
};

const descargarComprobanteDeposito = async (req, res) => {
  try {
    const rendicionId = parseInt(req.params.rendicionId, 10);
    const r = await RendicionPresupuesto.buscarPorId(rendicionId);
    if (!r?.comprobante_deposito_path) {
      return res.status(404).json({ success: false, mensaje: 'Sin comprobante de depósito.' });
    }
    if (!fs.existsSync(r.comprobante_deposito_path)) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no encontrado en disco.' });
    }
    res.download(r.comprobante_deposito_path, r.comprobante_deposito_nombre || 'comprobante-deposito');
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al descargar.' });
  }
};

const eliminarComprobanteDeposito = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const rendicionId = parseInt(req.params.rendicionId, 10);
    const periodo = await RendicionCajaPeriodo.buscarPeriodoPorId(periodoId);
    if (!periodo || periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Período no editable.' });
    }
    await RendicionPresupuesto.eliminarComprobanteDeposito(rendicionId);
    res.json({ success: true, mensaje: 'Comprobante eliminado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar comprobante.' });
  }
};

module.exports = {
  listarPeriodos,
  crearPeriodo,
  detallePeriodo,
  guardarDepositos,
  cerrarPeriodo,
  reabrirPeriodo,
  subirComprobanteDeposito,
  descargarComprobanteDeposito,
  eliminarComprobanteDeposito,
  MESES_NOMBRE
};
