const { pool } = require('../config/database');

class BolsaHorasAvisoPendiente {
  static async encolar(datos) {
    const {
      actividad_id,
      encargado_empleado_id,
      encargado_email,
      encargado_nombre,
      modo,
      empresa,
      proyecto_nombre,
      descripcion_resumen,
      horas_trabajadas,
      consultor_nombre,
      usuario_nombre,
      usuario_email
    } = datos;

    await pool.execute(
      `INSERT INTO cp_actividades_avisos_pendientes (
        actividad_id, encargado_empleado_id, encargado_email, encargado_nombre,
        modo, empresa, proyecto_nombre, descripcion_resumen, horas_trabajadas,
        consultor_nombre, usuario_nombre, usuario_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        encargado_empleado_id = VALUES(encargado_empleado_id),
        encargado_email = VALUES(encargado_email),
        encargado_nombre = VALUES(encargado_nombre),
        modo = IF(modo = 'creada' AND VALUES(modo) = 'actualizada', 'actualizada', VALUES(modo)),
        empresa = VALUES(empresa),
        proyecto_nombre = VALUES(proyecto_nombre),
        descripcion_resumen = VALUES(descripcion_resumen),
        horas_trabajadas = VALUES(horas_trabajadas),
        consultor_nombre = VALUES(consultor_nombre),
        usuario_nombre = VALUES(usuario_nombre),
        usuario_email = VALUES(usuario_email),
        ultima_modificacion_at = CURRENT_TIMESTAMP`,
      [
        actividad_id,
        encargado_empleado_id || null,
        encargado_email,
        encargado_nombre || null,
        modo === 'actualizada' ? 'actualizada' : 'creada',
        empresa || null,
        proyecto_nombre || null,
        descripcion_resumen || null,
        horas_trabajadas != null ? horas_trabajadas : null,
        consultor_nombre || null,
        usuario_nombre || null,
        usuario_email || null
      ]
    );
  }

  static async listarEncargadosConPendientes() {
    const [rows] = await pool.execute(
      `SELECT DISTINCT encargado_email, encargado_nombre
       FROM cp_actividades_avisos_pendientes
       WHERE encargado_email IS NOT NULL AND TRIM(encargado_email) != ''
       ORDER BY encargado_nombre, encargado_email`
    );
    return rows;
  }

  static async listarPorEncargado(encargadoEmail) {
    const email = String(encargadoEmail || '').trim().toLowerCase();
    const [rows] = await pool.execute(
      `SELECT *
       FROM cp_actividades_avisos_pendientes
       WHERE LOWER(encargado_email) = ?
       ORDER BY ultima_modificacion_at ASC, id ASC`,
      [email]
    );
    return rows;
  }

  static async eliminarPorEncargado(encargadoEmail) {
    const email = String(encargadoEmail || '').trim().toLowerCase();
    const [r] = await pool.execute(
      `DELETE FROM cp_actividades_avisos_pendientes WHERE LOWER(encargado_email) = ?`,
      [email]
    );
    return r.affectedRows;
  }

  static async contarPendientes() {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM cp_actividades_avisos_pendientes`
    );
    return rows[0]?.total || 0;
  }
}

module.exports = BolsaHorasAvisoPendiente;
