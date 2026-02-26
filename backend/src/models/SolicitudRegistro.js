const { pool } = require('../config/database');

class SolicitudRegistro {
  static async crear(datos) {
    const { nombres, apellidos, email, dni, telefono, cargo_solicitado, motivo } = datos;

    const [result] = await pool.execute(
      `INSERT INTO solicitudes_registro 
       (nombres, apellidos, email, dni, telefono, cargo_solicitado, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombres, apellidos, email, dni || null, telefono || null, cargo_solicitado || null, motivo || null]
    );

    return result.insertId;
  }

  static async listarPendientes() {
    const [rows] = await pool.execute(
      `SELECT * FROM solicitudes_registro 
       WHERE estado = 'pendiente' 
       ORDER BY created_at ASC`
    );
    return rows;
  }

  static async listarTodas() {
    const [rows] = await pool.execute(
      `SELECT sr.*, 
              CONCAT(e.nombres, ' ', e.apellidos) as revisado_por_nombre
       FROM solicitudes_registro sr
       LEFT JOIN empleados e ON sr.revisado_por = e.id
       ORDER BY sr.created_at DESC`
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM solicitudes_registro WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async buscarPorEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM solicitudes_registro WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async aprobar(id, revisadoPor, comentarios = null) {
    await pool.execute(
      `UPDATE solicitudes_registro 
       SET estado = 'aprobada', 
           revisado_por = ?, 
           fecha_revision = NOW(),
           comentarios_revision = ?
       WHERE id = ?`,
      [revisadoPor, comentarios, id]
    );
  }

  static async rechazar(id, revisadoPor, comentarios = null) {
    await pool.execute(
      `UPDATE solicitudes_registro 
       SET estado = 'rechazada', 
           revisado_por = ?, 
           fecha_revision = NOW(),
           comentarios_revision = ?
       WHERE id = ?`,
      [revisadoPor, comentarios, id]
    );
  }

  static async contarPendientes() {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM solicitudes_registro WHERE estado = 'pendiente'`
    );
    return rows[0].total;
  }
}

module.exports = SolicitudRegistro;
