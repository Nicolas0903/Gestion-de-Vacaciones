const path = require('path');
const fs = require('fs');
const ConsumoFabricMonto = require('../models/ConsumoFabricMonto');
const ConsumoFabricCarga = require('../models/ConsumoFabricCarga');
const {
  parsePaygWorkbook,
  parseMontosWorkbook,
  normCliente,
  parseMesInput
} = require('../services/consumoFabricPaygParser');
const {
  construirReporte,
  exportarReporteExcel,
  refrescarInsightsForDisplay
} = require('../services/consumoFabricReporteService');
const { generarReportePdf } = require('../services/consumoFabricPdfService');

async function armarReporteCompleto(meta, filas, mes, anio) {
  const montoMensual = await ConsumoFabricMonto.buscarPorClientePeriodo(meta.customerName, mes, anio);
  const historicoMontos = await ConsumoFabricMonto.historicoPorCliente(meta.customerName);
  const historicoCu = await ConsumoFabricCarga.historicoCuPorCliente(meta.customerName);
  return construirReporte(
    { ...meta, month: mes, year: anio },
    filas,
    montoMensual,
    { historicoMontos, historicoCu }
  );
}

const uploadsDir = path.join(__dirname, '../../uploads/consumo-fabric');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const esAdmin = (req) => req.usuario?.rol_nombre === 'admin';

const responderError = (res, err, fallback = 'Error en la operación') => {
  const msg = err?.message || fallback;
  res.status(msg.includes('inválid') || msg.includes('requer') || msg.includes('vací') ? 400 : 500).json({
    success: false,
    mensaje: msg
  });
};

exports.listarMontos = async (req, res) => {
  try {
    const data = await ConsumoFabricMonto.listar({
      anio: req.query.anio,
      mes: req.query.mes,
      customer: req.query.customer
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('consumoFabric.listarMontos:', err);
    res.status(500).json({ success: false, mensaje: 'Error al listar montos' });
  }
};

exports.guardarMonto = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({ success: false, mensaje: 'Solo administradores' });
  }
  try {
    const data = await ConsumoFabricMonto.upsert(req.body, req.usuario.id);
    res.json({ success: true, data, mensaje: 'Monto guardado' });
  } catch (err) {
    responderError(res, err, 'No se pudo guardar el monto');
  }
};

exports.eliminarMonto = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({ success: false, mensaje: 'Solo administradores' });
  }
  try {
    const ok = await ConsumoFabricMonto.eliminar(req.params.id);
    if (!ok) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    res.json({ success: true, mensaje: 'Monto eliminado' });
  } catch (err) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

exports.importarMontos = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({ success: false, mensaje: 'Solo administradores' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, mensaje: 'Suba un archivo Excel' });
  }
  try {
    const filas = await parseMontosWorkbook(req.file.buffer, true);
    let ok = 0;
    for (const row of filas) {
      await ConsumoFabricMonto.upsert(row, req.usuario.id);
      ok += 1;
    }
    res.json({ success: true, mensaje: `${ok} montos importados`, data: { importados: ok } });
  } catch (err) {
    responderError(res, err, 'No se pudo importar');
  }
};

exports.listarCargas = async (req, res) => {
  try {
    const data = await ConsumoFabricCarga.listar();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, mensaje: 'Error al listar cargas' });
  }
};

exports.obtenerCarga = async (req, res) => {
  try {
    const row = await ConsumoFabricCarga.buscarPorId(req.params.id);
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    if (row.reporte_json) {
      row.reporte_json = refrescarInsightsForDisplay(row.reporte_json);
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener reporte' });
  }
};

exports.subirPayg = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({ success: false, mensaje: 'Solo administradores' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, mensaje: 'Suba el Excel con hoja PAYG' });
  }
  try {
    const { meta, filas } = await parsePaygWorkbook(req.file.path, false);

    const mes = meta.month || parseMesInput(req.body.mes);
    const anio = meta.year || parseInt(req.body.anio, 10);
    if (!mes || !anio) {
      throw new Error('No se pudo detectar mes/año del archivo. Indíquelos al subir.');
    }

    const reporte = await armarReporteCompleto(meta, filas, mes, anio);

    const storedName = `payg-${Date.now()}-${req.file.filename}`;
    const storedPath = path.join(uploadsDir, storedName);
    fs.renameSync(req.file.path, storedPath);

    const carga = await ConsumoFabricCarga.crear({
      customer_name: meta.customerName,
      customer_domain: meta.customerDomain,
      customer_country: meta.customerCountry,
      codigo_ingram: meta.codigoIngram,
      reseller: meta.reseller,
      periodo_inicio: meta.periodoInicio,
      periodo_fin: meta.periodoFin,
      mes,
      anio,
      archivo_nombre: req.file.originalname,
      archivo_path: storedPath,
      total_filas: filas.length,
      reporte_json: reporte,
      creado_por: req.usuario.id
    });

    res.status(201).json({
      success: true,
      mensaje: 'Reporte generado',
      data: carga
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {
        /* ignore */
      }
    }
    responderError(res, err, 'No se pudo procesar el archivo PAYG');
  }
};

exports.exportarCarga = async (req, res) => {
  try {
    const row = await ConsumoFabricCarga.buscarPorId(req.params.id);
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    const buffer = await exportarReporteExcel(refrescarInsightsForDisplay(row.reporte_json));
    const safeName = String(row.customer_name).replace(/[^\w.-]+/g, '_').slice(0, 40);
    const filename = `consumo-fabric-${safeName}-${row.anio}-${row.mes}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('consumoFabric.exportar:', err);
    res.status(500).json({ success: false, mensaje: 'Error al exportar' });
  }
};

exports.exportarCargaPdf = async (req, res) => {
  try {
    const row = await ConsumoFabricCarga.buscarPorId(req.params.id);
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    const buffer = await generarReportePdf(refrescarInsightsForDisplay(row.reporte_json));
    const safeName = String(row.customer_name).replace(/[^\w.-]+/g, '_').slice(0, 40);
    const filename = `consumo-fabric-${safeName}-${row.anio}-${row.mes}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('consumoFabric.exportarPdf:', err);
    res.status(500).json({ success: false, mensaje: 'Error al exportar PDF' });
  }
};

exports.eliminarCarga = async (req, res) => {
  if (!esAdmin(req)) {
    return res.status(403).json({ success: false, mensaje: 'Solo administradores' });
  }
  try {
    const row = await ConsumoFabricCarga.eliminar(req.params.id);
    if (!row) return res.status(404).json({ success: false, mensaje: 'No encontrado' });
    if (row.archivo_path && fs.existsSync(row.archivo_path)) {
      try {
        fs.unlinkSync(row.archivo_path);
      } catch (_) {
        /* ignore */
      }
    }
    res.json({ success: true, mensaje: 'Carga eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, mensaje: 'Error al eliminar' });
  }
};

exports.clientesMontos = async (req, res) => {
  try {
    const rows = await ConsumoFabricMonto.listar({});
    const names = [...new Set(rows.map((r) => r.customer_name))].sort();
    res.json({ success: true, data: names });
  } catch (err) {
    res.status(500).json({ success: false, mensaje: 'Error' });
  }
};
