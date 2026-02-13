const { pool } = require('../config/database');
const crypto = require('crypto');

class TokenAprobacion {
  // Generar token único
  static generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Crear token para una solicitud
  static async crear(solicitudId, aprobadorId, accion) {
    const token = this.generarToken();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 72); // Expira en 72 horas

    await pool.execute(
      `INSERT INTO tokens_aprobacion (token, solicitud_id, aprobador_id, accion, expira_en)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         token = VALUES(token),
         expira_en = VALUES(expira_en),
         usado = FALSE`,
      [token, solicitudId, aprobadorId, accion, expiracion]
    );

    return token;
  }

  // Buscar token válido
  static async buscar(token) {
    const [rows] = await pool.execute(
      `SELECT ta.*, sv.estado as solicitud_estado, sv.empleado_id,
              e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
       FROM tokens_aprobacion ta
       JOIN solicitudes_vacaciones sv ON ta.solicitud_id = sv.id
       JOIN empleados e ON sv.empleado_id = e.id
       WHERE ta.token = ? AND ta.usado = FALSE AND ta.expira_en > NOW()`,
      [token]
    );
    return rows[0];
  }

  // Marcar token como usado
  static async marcarUsado(token) {
    await pool.execute(
      `UPDATE tokens_aprobacion SET usado = TRUE, usado_en = NOW() WHERE token = ?`,
      [token]
    );
  }

  // Invalidar tokens anteriores de una solicitud
  static async invalidarPorSolicitud(solicitudId) {
    await pool.execute(
      `UPDATE tokens_aprobacion SET usado = TRUE WHERE solicitud_id = ?`,
      [solicitudId]
    );
  }
}

module.exports = TokenAprobacion;
