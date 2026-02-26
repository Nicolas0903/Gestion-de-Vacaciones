const { pool } = require('../config/database');
const crypto = require('crypto');

class TokenRecuperacion {
  static generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async crear(empleadoId) {
    const token = this.generarToken();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 24); // Expira en 24 horas

    // Invalidar tokens anteriores del mismo empleado
    await pool.execute(
      'UPDATE tokens_recuperacion SET usado = TRUE WHERE empleado_id = ? AND usado = FALSE',
      [empleadoId]
    );

    await pool.execute(
      `INSERT INTO tokens_recuperacion (empleado_id, token, expira_en)
       VALUES (?, ?, ?)`,
      [empleadoId, token, expiracion]
    );

    return token;
  }

  static async buscar(token) {
    const [rows] = await pool.execute(
      `SELECT tr.*, e.email, e.nombres, e.apellidos
       FROM tokens_recuperacion tr
       JOIN empleados e ON tr.empleado_id = e.id
       WHERE tr.token = ? AND tr.usado = FALSE AND tr.expira_en > NOW()`,
      [token]
    );
    return rows[0];
  }

  static async marcarUsado(token) {
    await pool.execute(
      'UPDATE tokens_recuperacion SET usado = TRUE WHERE token = ?',
      [token]
    );
  }

  static async limpiarExpirados() {
    await pool.execute(
      'DELETE FROM tokens_recuperacion WHERE expira_en < NOW() OR usado = TRUE'
    );
  }
}

module.exports = TokenRecuperacion;
