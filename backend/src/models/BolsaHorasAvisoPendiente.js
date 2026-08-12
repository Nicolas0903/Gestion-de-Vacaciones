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
      consultor_empleado_id,
      consultor_email,
      usuario_nombre,
      usuario_email
    } = datos;

    await pool.execute(
      `INSERT INTO cp_actividades_avisos_pendientes (
        actividad_id, encargado_empleado_id, encargado_email, encargado_nombre,
        modo, empresa, proyecto_nombre, descripcion_resumen, horas_trabajadas,
        consultor_nombre, consultor_empleado_id, consultor_email,
        usuario_nombre, usuario_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        consultor_empleado_id = VALUES(consultor_empleado_id),
        consultor_email = VALUES(consultor_email),
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
        consultor_empleado_id || null,
        consultor_email || null,
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

  /** Encargados con actividades creadas o modificadas en el mes calendario (America/Lima vía fechas UTC en servidor). */
  static async listarEncargadosConCambiosEnMes(inicioSql, finExclusivoSql) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT
         LOWER(TRIM(enc.email)) AS encargado_email,
         CONCAT(TRIM(enc.nombres), ' ', TRIM(enc.apellidos)) AS encargado_nombre
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       INNER JOIN empleados enc ON enc.id = p.encargado_empleado_id
       WHERE enc.email IS NOT NULL AND TRIM(enc.email) != ''
         AND a.updated_at >= ? AND a.updated_at < ?
       ORDER BY encargado_nombre, encargado_email`,
      [inicioSql, finExclusivoSql]
    );
    return rows;
  }

  /** Filas de reporte mensual para un encargado (misma forma que la cola semanal). */
  static async listarCambiosMesPorEncargado(encargadoEmail, inicioSql, finExclusivoSql) {
    const email = String(encargadoEmail || '').trim().toLowerCase();
    const [rows] = await pool.execute(
      `SELECT
         a.id AS actividad_id,
         p.encargado_empleado_id,
         LOWER(TRIM(enc.email)) AS encargado_email,
         CONCAT(TRIM(enc.nombres), ' ', TRIM(enc.apellidos)) AS encargado_nombre,
         IF(a.created_at >= ? AND a.created_at < ?, 'creada', 'actualizada') AS modo,
         p.empresa AS empresa,
         p.proyecto AS proyecto_nombre,
         a.descripcion_actividad AS descripcion_resumen,
         a.horas_trabajadas,
         CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre,
         a.consultor_asignado_id AS consultor_empleado_id,
         LOWER(TRIM(ec.email)) AS consultor_email,
         NULL AS usuario_nombre,
         NULL AS usuario_email,
         a.updated_at AS ultima_modificacion_at
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       INNER JOIN empleados enc ON enc.id = p.encargado_empleado_id
       INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
       WHERE LOWER(TRIM(enc.email)) = ?
         AND a.updated_at >= ? AND a.updated_at < ?
       ORDER BY a.updated_at ASC, a.id ASC`,
      [inicioSql, finExclusivoSql, email, inicioSql, finExclusivoSql]
    );
    return rows;
  }

  static async contarPendientes() {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM cp_actividades_avisos_pendientes`
    );
    return rows[0]?.total || 0;
  }
}

module.exports = BolsaHorasAvisoPendiente;
