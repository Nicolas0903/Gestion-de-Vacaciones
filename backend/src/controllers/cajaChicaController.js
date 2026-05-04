const { Reembolso, CajaChica } = require('../models');
const path = require('path');
const fs = require('fs');
const emailService = require('../services/emailService');
const PDFService = require('../services/pdfService');

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

const TIPOS_INGRESO_LABEL = {
  caja_chica: 'Caja chica',
  deposito_adicional: 'Depósito adicional del mes',
  saldo_anterior: 'Saldo de la caja chica (cierre del período anterior)'
};

const ADJUNTO_INGRESOS_DIR = path.join(__dirname, '../../uploads/caja-chica-ingresos');

function mapIngresoRowResp(row) {
  return {
    id: row.id,
    tipo_motivo: row.tipo_motivo,
    motivo_label: TIPOS_INGRESO_LABEL[row.tipo_motivo],
    monto: Number(row.monto),
    orden: row.orden,
    fecha_deposito: CajaChica.normalizarFechaDepositoApi(row.fecha_deposito),
    comprobante_archivo: row.comprobante_archivo || null,
    tiene_comprobante: !!(row.comprobante_archivo && String(row.comprobante_archivo).trim())
  };
}

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

function mapEgresoRow(r) {
  const codigo = Reembolso.codigoTicket(r);
  const tiene = !!(r.tiene_comprobante === 1 || r.tiene_comprobante === true);
  const ruc = String(r.ruc_proveedor || '').trim();
  const nroDoc = String(r.numero_documento || '').trim();
  return {
    reembolso_id: r.id,
    fecha_documento: r.fecha_solicitud_usuario,
    ruc_proveedor: tiene ? (ruc || '—') : 'Recibo Prayaga',
    numero_documento: tiene ? (nroDoc || r.archivo_comprobante_nombre || '—') : codigo,
    descripcion: r.concepto,
    monto: Number(r.monto) || 0,
    codigo_ticket: codigo,
    tiene_comprobante: tiene
  };
}

/** Facturas (con comprobante) primero; luego recibos Prayaga. Dentro de cada grupo, por fecha de documento. */
function ordenarReembolsosFacturaLuegoRecibo(rows) {
  const esFactura = (r) => r.tiene_comprobante === 1 || r.tiene_comprobante === true;
  return [...rows].sort((a, b) => {
    const ta = esFactura(a) ? 0 : 1;
    const tb = esFactura(b) ? 0 : 1;
    if (ta !== tb) return ta - tb;
    const da = String(a.fecha_solicitud_usuario || '');
    const db = String(b.fecha_solicitud_usuario || '');
    if (da !== db) return da.localeCompare(db);
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

async function generarPdfCompletoCajaChicaBuffer(periodo, enviadoPorNombre) {
  const data = await construirDetallePeriodo(periodo);
  const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
  const reembolsosOrdenados = ordenarReembolsosFacturaLuegoRecibo(
    await Reembolso.listarAprobadosPorRangoFechaDocumento(desde, hasta)
  );
  const periodoEtiqueta = `${MESES_NOMBRE[periodo.mes] || periodo.mes} ${periodo.anio}`;
  const estadoLabel = periodo.estado === 'cerrado' ? 'Cerrado' : 'Borrador';
  const resumenPdf = await PDFService.generarResumenCajaChicaFormal({
    periodoEtiqueta,
    estadoPeriodo: estadoLabel,
    saldoCierreGuardado: periodo.estado === 'cerrado' ? periodo.saldo_cierre : null,
    rangoDesde: data.rango_fecha_documento.desde,
    rangoHasta: data.rango_fecha_documento.hasta,
    ingresos: data.ingresos,
    egresos: data.egresos,
    totales: data.totales,
    enviadoPorNombre: enviadoPorNombre || '—'
  });
  const buffer = await PDFService.generarPdfCajaChicaCompletoUnArchivo(resumenPdf, reembolsosOrdenados);
  const safeFile = String(periodoEtiqueta).replace(/[^\w\-]+/g, '_');
  return { buffer, safeFile, periodoEtiqueta, estadoLabel, data };
}

const listarPeriodos = async (req, res) => {
  try {
    const rows = await CajaChica.listarPeriodos();
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
    const existe = await CajaChica.buscarPeriodoPorAnioMes(anio, mes);
    if (existe) {
      return res.status(409).json({ success: false, mensaje: 'Ya existe un período para ese mes.' });
    }
    const id = await CajaChica.crearPeriodoYSembrarSaldoAnterior(anio, mes);
    const row = await CajaChica.buscarPeriodoPorId(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al crear período.' });
  }
};

async function construirDetallePeriodo(periodo) {
  const id = periodo.id;
  const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
  const [ingresosRows, reembolsosRaw] = await Promise.all([
    CajaChica.listarIngresos(id),
    Reembolso.listarAprobadosPorRangoFechaDocumento(desde, hasta)
  ]);

  const ingresos = ingresosRows.map((row) => ({
    id: row.id,
    tipo_motivo: row.tipo_motivo,
    motivo_label: TIPOS_INGRESO_LABEL[row.tipo_motivo] || row.tipo_motivo,
    monto: Number(row.monto),
    orden: row.orden,
    fecha_deposito: CajaChica.normalizarFechaDepositoApi(row.fecha_deposito),
    comprobante_archivo: row.comprobante_archivo || null,
    tiene_comprobante: !!(row.comprobante_archivo && String(row.comprobante_archivo).trim())
  }));

  const totalIngreso = ingresos.reduce((s, x) => s + x.monto, 0);
  const reembolsos = ordenarReembolsosFacturaLuegoRecibo(reembolsosRaw);
  const egresos = reembolsos.map(mapEgresoRow);
  const totalEgreso = egresos.reduce((s, x) => s + x.monto, 0);
  const saldoCalculado = totalIngreso - totalEgreso;
  const saldoAnteriorSugerido = await CajaChica.saldoCierrePeriodoAnterior(periodo.anio, periodo.mes);

  return {
    periodo,
    ingresos,
    egresos,
    totales: {
      total_ingreso: totalIngreso,
      total_egreso: totalEgreso,
      saldo: saldoCalculado
    },
    saldo_anterior_sugerido: saldoAnteriorSugerido,
    rango_fecha_documento: { desde, hasta }
  };
}

const detallePeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    const data = await construirDetallePeriodo(periodo);
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cargar el período.' });
  }
};

const guardarIngresos = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Solo se editan ingresos en borrador.' });
    }
    const lineas = Array.isArray(req.body.ingresos) ? req.body.ingresos : [];
    await CajaChica.reemplazarIngresos(id, lineas);
    const ingresos = await CajaChica.listarIngresos(id);
    res.json({
      success: true,
      data: ingresos.map(mapIngresoRowResp)
    });
  } catch (e) {
    console.error(e);
    const sqlMsg =
      typeof e.sqlMessage === 'string' ? e.sqlMessage : typeof e.message === 'string' ? e.message : '';
    if (
      sqlMsg.includes("Unknown column 'fecha_deposito'") ||
      sqlMsg.includes("Unknown column 'comprobante_archivo'") ||
      e.errno === 1054
    ) {
      return res.status(500).json({
        success: false,
        mensaje:
          'Falta ejecutar la migración SQL en la base de datos (p. ej. backend/sql/caja_chica_ingresos_fecha_adjunto.sql) sobre la BD donde están las tablas caja_chica_*. Mensaje técnico: ' +
          sqlMsg
      });
    }
    const known =
      e.message === 'Monto inválido' ||
      e.message === 'tipo_motivo no válido' ||
      String(e.message || '').startsWith('fecha_deposito') ||
      e.message === 'Línea de ingreso no encontrada o no pertenece al período';
    const msg = known ? e.message : sqlMsg ? `No se pudieron guardar los ingresos: ${sqlMsg}` : 'Error al guardar ingresos.';
    res.status(400).json({ success: false, mensaje: msg });
  }
};

const cerrarPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'El período ya está cerrado.' });
    }
    const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
    const [ingresosRows, reembolsos] = await Promise.all([
      CajaChica.listarIngresos(id),
      Reembolso.listarAprobadosPorRangoFechaDocumento(desde, hasta)
    ]);
    const totalIngreso = ingresosRows.reduce((s, r) => s + Number(r.monto), 0);
    const totalEgreso = reembolsos.reduce((s, r) => s + (Number(r.monto) || 0), 0);
    const saldo = totalIngreso - totalEgreso;
    const ok = await CajaChica.cerrarPeriodo(id, saldo);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo cerrar el período.' });
    }
    const actualizado = await CajaChica.buscarPeriodoPorId(id);
    res.json({
      success: true,
      mensaje: 'Período cerrado. El saldo quedará disponible para el mes siguiente.',
      data: {
        periodo: actualizado,
        totales: {
          total_ingreso: totalIngreso,
          total_egreso: totalEgreso,
          saldo
        }
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cerrar período.' });
  }
};

const reabrirPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'cerrado') {
      return res.status(400).json({ success: false, mensaje: 'Solo se puede reabrir un período cerrado.' });
    }
    const ok = await CajaChica.reabrirPeriodo(id);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo reabrir el período.' });
    }
    const actualizado = await CajaChica.buscarPeriodoPorId(id);
    res.json({
      success: true,
      mensaje:
        'Período reabierto en borrador. Podrás editar ingresos y volver a cerrar. El saldo de cierre anterior quedó anulado.',
      data: { periodo: actualizado }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al reabrir período.' });
  }
};

const descargarResumenPdf = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    const u = req.usuario;
    const enviadoPorNombre = `${u.nombres || ''} ${u.apellidos || ''}`.trim() || u.email || '—';
    const { buffer, safeFile } = await generarPdfCompletoCajaChicaBuffer(periodo, enviadoPorNombre);
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    if (!buf.length || buf.length < 200) {
      return res.status(500).json({ success: false, mensaje: 'No se pudo generar el PDF.' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Caja-chica-${safeFile}-completo.pdf"`);
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: e.message || 'Error al generar PDF.' });
  }
};

const enviarResumenRocio = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    const u = req.usuario;
    const enviadoPorNombre = `${u.nombres || ''} ${u.apellidos || ''}`.trim() || u.email || '—';
    const { buffer, periodoEtiqueta, estadoLabel, data } = await generarPdfCompletoCajaChicaBuffer(
      periodo,
      enviadoPorNombre
    );

    const resultado = await emailService.enviarCajaChicaResumenRocio({
      periodoEtiqueta,
      estadoPeriodo: estadoLabel,
      saldoCierreGuardado: periodo.estado === 'cerrado' ? periodo.saldo_cierre : null,
      rangoDesde: data.rango_fecha_documento.desde,
      rangoHasta: data.rango_fecha_documento.hasta,
      ingresos: data.ingresos,
      egresos: data.egresos,
      totales: data.totales,
      enviadoPorNombre,
      pdfCompletoBufferPrebuilt: buffer
    });

    if (!resultado.ok) {
      return res.status(503).json({ success: false, mensaje: resultado.mensaje || 'No se pudo enviar el correo.' });
    }
    const lista = resultado.destinatarios?.length
      ? resultado.destinatarios.join(', ')
      : (process.env.CAJA_CHICA_EMAIL_ROCIO || 'rocio.picon@prayaga.biz').trim();
    res.json({
      success: true,
      mensaje: `Resumen enviado a: ${lista}.`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al enviar resumen.' });
  }
};

const subirAdjuntoIngreso = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const ingresoId = parseInt(req.params.ingresoId, 10);
    if (!req.file?.filename) {
      return res.status(400).json({ success: false, mensaje: 'Archivo requerido.' });
    }
    const periodo = await CajaChica.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      CajaChica.eliminarArchivoComprobante(req.file.filename);
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      CajaChica.eliminarArchivoComprobante(req.file.filename);
      return res.status(400).json({ success: false, mensaje: 'Solo se adjuntan archivos en período borrador.' });
    }
    const ing = await CajaChica.obtenerIngresoPorIdEnPeriodo(ingresoId, periodoId);
    if (!ing) {
      CajaChica.eliminarArchivoComprobante(req.file.filename);
      return res.status(404).json({ success: false, mensaje: 'Línea de ingreso no encontrada.' });
    }
    const prev = ing.comprobante_archivo;
    const ok = await CajaChica.actualizarComprobanteIngreso(ingresoId, periodoId, req.file.filename);
    if (!ok) {
      CajaChica.eliminarArchivoComprobante(req.file.filename);
      return res.status(400).json({ success: false, mensaje: 'No se pudo guardar el adjunto.' });
    }
    if (prev && prev !== req.file.filename) {
      CajaChica.eliminarArchivoComprobante(prev);
    }
    res.json({
      success: true,
      data: { comprobante_archivo: req.file.filename, tiene_comprobante: true }
    });
  } catch (e) {
    console.error(e);
    if (req.file?.filename) CajaChica.eliminarArchivoComprobante(req.file.filename);
    res.status(500).json({ success: false, mensaje: 'Error al subir archivo.' });
  }
};

const descargarAdjuntoIngreso = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const ingresoId = parseInt(req.params.ingresoId, 10);
    const ing = await CajaChica.obtenerIngresoPorIdEnPeriodo(ingresoId, periodoId);
    if (!ing?.comprobante_archivo) {
      return res.status(404).json({ success: false, mensaje: 'No hay archivo adjunto.' });
    }
    const full = path.join(ADJUNTO_INGRESOS_DIR, ing.comprobante_archivo);
    if (!fs.existsSync(full)) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no encontrado en servidor.' });
    }
    res.download(full, ing.comprobante_archivo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al descargar.' });
  }
};

const eliminarAdjuntoIngreso = async (req, res) => {
  try {
    const periodoId = parseInt(req.params.id, 10);
    const ingresoId = parseInt(req.params.ingresoId, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(periodoId);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Solo en borrador se puede quitar el adjunto.' });
    }
    const ok = await CajaChica.limpiarComprobanteIngreso(ingresoId, periodoId);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Línea no encontrada.' });
    }
    res.json({ success: true, mensaje: 'Adjunto eliminado.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar adjunto.' });
  }
};

module.exports = {
  listarPeriodos,
  crearPeriodo,
  detallePeriodo,
  guardarIngresos,
  cerrarPeriodo,
  reabrirPeriodo,
  descargarResumenPdf,
  enviarResumenRocio,
  subirAdjuntoIngreso,
  descargarAdjuntoIngreso,
  eliminarAdjuntoIngreso
};
