const { pool } = require('../config/database');

class BackupSnapshot {
  static async crear(data) {
    const [result] = await pool.query(
      `INSERT INTO backup_snapshots
        (turno, fecha, excel_path, sql_path, excel_bytes, sql_bytes, email_enviado, email_adjunto_sql, estado, mensaje_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.turno,
        data.fecha,
        data.excel_path,
        data.sql_path || null,
        data.excel_bytes || 0,
        data.sql_bytes ?? null,
        data.email_enviado ? 1 : 0,
        data.email_adjunto_sql ? 1 : 0,
        data.estado || 'ok',
        data.mensaje_error || null
      ]
    );
    return this.buscarPorId(result.insertId);
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query('SELECT * FROM backup_snapshots WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async listar(limit = 120) {
    const [rows] = await pool.query(
      `SELECT id, turno, fecha, excel_path, sql_path, excel_bytes, sql_bytes,
              email_enviado, email_adjunto_sql, estado, mensaje_error, created_at
       FROM backup_snapshots
       ORDER BY created_at DESC
       LIMIT ?`,
      [Math.min(Math.max(Number(limit) || 120, 1), 500)]
    );
    return rows;
  }

  static async listarAntiguos(antesDeFecha) {
    const [rows] = await pool.query(
      'SELECT * FROM backup_snapshots WHERE fecha < ? ORDER BY fecha ASC',
      [antesDeFecha]
    );
    return rows;
  }

  static async eliminarPorId(id) {
    await pool.query('DELETE FROM backup_snapshots WHERE id = ?', [id]);
  }
}

module.exports = BackupSnapshot;
