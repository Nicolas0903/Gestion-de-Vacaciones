const { pool } = require('../config/database');
const crypto = require('crypto');

class TokenReembolso {
  static generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async crear(reembolsoId, aprobadorId, accion) {
    const token = this.generarToken();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 72);

    await pool.execute(
      `INSERT INTO tokens_reembolso (token, reembolso_id, aprobador_id, accion, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [token, reembolsoId, aprobadorId, accion, expiracion]
    );

    return token;
  }

  static async buscar(token) {
    const [rows] = await pool.execute(
      `SELECT tr.*, sr.estado as reembolso_estado, sr.empleado_id,
              e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
       FROM tokens_reembolso tr
       JOIN solicitudes_reembolso sr ON tr.reembolso_id = sr.id
       JOIN empleados e ON sr.empleado_id = e.id
       WHERE tr.token = ? AND tr.usado = FALSE AND tr.expira_en > NOW()`,
      [token]
    );
    return rows[0];
  }

  static async marcarUsado(token) {
    await pool.execute(
      `UPDATE tokens_reembolso SET usado = TRUE, usado_en = NOW() WHERE token = ?`,
      [token]
    );
  }

  static async invalidarTodosReembolso(reembolsoId) {
    await pool.execute(
      `UPDATE tokens_reembolso SET usado = TRUE, usado_en = NOW() WHERE reembolso_id = ? AND usado = FALSE`,
      [reembolsoId]
    );
  }
}

module.exports = TokenReembolso;
