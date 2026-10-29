const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/cotizaciones');

function asegurarDir(cotizacionId) {
  const dir = path.join(UPLOAD_DIR, String(cotizacionId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

class CotizacionAdjunto {
  static uploadDir(cotizacionId) {
    return asegurarDir(cotizacionId);
  }

  static async listarPorCotizacion(cotizacionId) {
    const [rows] = await pool.query(
      `SELECT a.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS subido_por_nombre
       FROM cotizacion_adjuntos a
       LEFT JOIN empleados e ON e.id = a.subido_por
       WHERE a.cotizacion_id = ?
       ORDER BY a.created_at DESC, a.id DESC`,
      [cotizacionId]
    );
    return rows;
  }

  static async buscarPorId(adjuntoId, cotizacionId) {
    const [rows] = await pool.query(
      `SELECT * FROM cotizacion_adjuntos WHERE id = ? AND cotizacion_id = ?`,
      [adjuntoId, cotizacionId]
    );
    return rows[0] || null;
  }

  static async crear(cotizacionId, { nombreOriginal, nombreArchivo, tamano, mime, comentario, subidoPor }) {
    const [r] = await pool.query(
      `INSERT INTO cotizacion_adjuntos
        (cotizacion_id, nombre_original, nombre_archivo, tamano_bytes, mime_type, comentario, subido_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacionId,
        nombreOriginal,
        nombreArchivo,
        tamano || 0,
        mime || null,
        comentario || null,
        subidoPor || null
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM cotizacion_adjuntos WHERE id = ?`, [r.insertId]);
    return rows[0];
  }

  static rutaAbsoluta(cotizacionId, nombreArchivo) {
    return path.join(asegurarDir(cotizacionId), nombreArchivo);
  }

  static async eliminar(adjuntoId, cotizacionId) {
    const row = await this.buscarPorId(adjuntoId, cotizacionId);
    if (!row) return false;
    const full = this.rutaAbsoluta(cotizacionId, row.nombre_archivo);
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (_) {
      /* ignore */
    }
    await pool.query(`DELETE FROM cotizacion_adjuntos WHERE id = ? AND cotizacion_id = ?`, [
      adjuntoId,
      cotizacionId
    ]);
    return true;
  }
}

module.exports = CotizacionAdjunto;
