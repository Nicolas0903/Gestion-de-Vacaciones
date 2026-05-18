const { pool } = require('../config/database');
const crypto = require('crypto');

/**
 * Tokens de un solo uso para aprobar/rechazar una rendición desde el email
 * (sin necesidad de hacer login). Espejo de TokenReembolso.
 */
class TokenRendicionPresupuesto {
  static generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async crear(rendicionId, aprobadorId, accion) {
    const token = this.generarToken();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 72);

    await pool.execute(
      `INSERT INTO tokens_rendicion_presupuesto (token, rendicion_id, aprobador_id, accion, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [token, rendicionId, aprobadorId, accion, expiracion]
    );

    return token;
  }

  static async buscar(token) {
    const [rows] = await pool.execute(
      `SELECT trp.*, rp.estado as rendicion_estado, rp.empleado_id,
              e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
       FROM tokens_rendicion_presupuesto trp
       JOIN rendiciones_presupuesto rp ON trp.rendicion_id = rp.id
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE trp.token = ? AND trp.usado = FALSE AND trp.expira_en > NOW()`,
      [token]
    );
    return rows[0];
  }

  static async marcarUsado(token) {
    await pool.execute(
      `UPDATE tokens_rendicion_presupuesto SET usado = TRUE, usado_en = NOW() WHERE token = ?`,
      [token]
    );
  }

  static async invalidarTodos(rendicionId) {
    await pool.execute(
      `UPDATE tokens_rendicion_presupuesto SET usado = TRUE, usado_en = NOW()
       WHERE rendicion_id = ? AND usado = FALSE`,
      [rendicionId]
    );
  }
}

module.exports = TokenRendicionPresupuesto;
