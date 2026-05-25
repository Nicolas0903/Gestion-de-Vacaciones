const fs = require('fs');
const path = require('path');
const {
  listarSnapshots,
  obtenerSnapshot,
  ejecutarRespaldo,
  resolverRutaSegura,
  etiquetaTurno,
  destinatariosBackup
} = require('../services/backupArchivoService');

const formatearSnapshot = (row) => ({
  id: row.id,
  turno: row.turno,
  turno_etiqueta: etiquetaTurno(row.turno),
  fecha: row.fecha,
  excel_bytes: row.excel_bytes,
  sql_bytes: row.sql_bytes,
  tiene_sql: !!row.sql_path,
  email_enviado: !!row.email_enviado,
  email_adjunto_sql: !!row.email_adjunto_sql,
  estado: row.estado,
  mensaje_error: row.mensaje_error,
  created_at: row.created_at,
  excel_nombre: row.excel_path ? path.basename(row.excel_path) : null,
  sql_nombre: row.sql_path ? path.basename(row.sql_path) : null
});

exports.listar = async (req, res) => {
  try {
    const limite = req.query.limit ? Number(req.query.limit) : 120;
    const rows = await listarSnapshots(limite);
    res.json({
      success: true,
      data: rows.map(formatearSnapshot),
      meta: {
        destinatarios_correo: destinatariosBackup(),
        horarios: ['08:30', '17:30'],
        timezone: process.env.BACKUP_TIMEZONE || 'America/Lima'
      }
    });
  } catch (err) {
    console.error('backupArchivo.listar:', err);
    res.status(500).json({ success: false, mensaje: 'Error al listar respaldos' });
  }
};

exports.descargar = async (req, res) => {
  try {
    const tipo = (req.params.tipo || '').toLowerCase();
    if (!['excel', 'sql'].includes(tipo)) {
      return res.status(400).json({ success: false, mensaje: 'Tipo de archivo inválido' });
    }

    const snap = await obtenerSnapshot(req.params.id);
    if (!snap) {
      return res.status(404).json({ success: false, mensaje: 'Respaldo no encontrado' });
    }

    const relPath = tipo === 'excel' ? snap.excel_path : snap.sql_path;
    if (!relPath) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no disponible' });
    }

    const filePath = resolverRutaSegura(relPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no encontrado en disco' });
    }

    res.download(filePath, path.basename(filePath));
  } catch (err) {
    console.error('backupArchivo.descargar:', err);
    res.status(500).json({ success: false, mensaje: 'Error al descargar respaldo' });
  }
};

exports.ejecutarManual = async (req, res) => {
  try {
    const turno = req.body?.turno === 'tarde' ? 'tarde' : 'manana';
    const resultado = await ejecutarRespaldo(turno);
    if (!resultado.ok) {
      return res.status(409).json({
        success: false,
        mensaje: resultado.mensaje || 'No se pudo ejecutar el respaldo'
      });
    }
    res.json({
      success: true,
      data: formatearSnapshot(resultado.snapshot),
      mensaje: 'Respaldo ejecutado correctamente'
    });
  } catch (err) {
    console.error('backupArchivo.ejecutarManual:', err);
    res.status(500).json({ success: false, mensaje: 'Error al ejecutar respaldo' });
  }
};
