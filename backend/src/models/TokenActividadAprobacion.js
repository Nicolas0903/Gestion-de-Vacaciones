const { pool } = require('../config/database');
const crypto = require('crypto');

class TokenActividadAprobacion {
  static generarToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async crear(actividadId, aprobadorEmpleadoId, accion) {
    const token = this.generarToken();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 72);
    await pool.execute(
      `INSERT INTO cp_actividades_aprobacion_tokens
       (token, actividad_id, aprobador_empleado_id, accion, expira_en)
       VALUES (?, ?, ?, ?, ?)`,
      [token, actividadId, aprobadorEmpleadoId, accion, expiracion]
    );
    return token;
  }

  static async buscar(token) {
    const [rows] = await pool.execute(
      `SELECT t.*,
              a.estado_aprobacion,
              a.requerido_por,
              a.descripcion_actividad,
              a.horas_trabajadas,
              a.consultor_asignado_id,
              CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre,
              p.proyecto AS proyecto_nombre,
              p.empresa AS empresa_nombre
       FROM cp_actividades_aprobacion_tokens t
       INNER JOIN cp_actividades a ON a.id = t.actividad_id
       INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE t.token = ? AND t.usado = 0 AND t.expira_en > NOW()`,
      [token]
    );
    return rows[0];
  }

  static async marcarUsado(token) {
    await pool.execute(
      `UPDATE cp_actividades_aprobacion_tokens SET usado = 1, usado_en = NOW() WHERE token = ?`,
      [token]
    );
  }

  static async invalidarPorActividad(actividadId) {
    await pool.execute(
      `UPDATE cp_actividades_aprobacion_tokens SET usado = 1, usado_en = NOW()
       WHERE actividad_id = ? AND usado = 0`,
      [actividadId]
    );
  }
}

module.exports = TokenActividadAprobacion;
