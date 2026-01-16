const { pool } = require('../config/database');

class Aprobacion {
  // Crear registro de aprobación
  static async crear(datos) {
    const { solicitud_id, aprobador_id, tipo_aprobacion } = datos;

    const [result] = await pool.execute(
      `INSERT INTO aprobaciones (solicitud_id, aprobador_id, tipo_aprobacion, estado)
       VALUES (?, ?, ?, 'pendiente')`,
      [solicitud_id, aprobador_id, tipo_aprobacion]
    );

    return result.insertId;
  }

  // Buscar por ID
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT a.*, 
              e.nombres as aprobador_nombres, e.apellidos as aprobador_apellidos, e.cargo as aprobador_cargo
       FROM aprobaciones a
       JOIN empleados e ON a.aprobador_id = e.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Listar aprobaciones de una solicitud
  static async listarPorSolicitud(solicitudId) {
    const [rows] = await pool.execute(
      `SELECT a.*, 
              e.nombres as aprobador_nombres, e.apellidos as aprobador_apellidos, e.cargo as aprobador_cargo
       FROM aprobaciones a
       JOIN empleados e ON a.aprobador_id = e.id
       WHERE a.solicitud_id = ?
       ORDER BY a.created_at ASC`,
      [solicitudId]
    );
    return rows;
  }

  // Aprobar
  static async aprobar(id, comentarios = null, firmaDigital = null) {
    const [result] = await pool.execute(
      `UPDATE aprobaciones 
       SET estado = 'aprobado', comentarios = ?, firma_digital = ?, fecha_accion = NOW()
       WHERE id = ?`,
      [comentarios, firmaDigital, id]
    );
    return result.affectedRows > 0;
  }

  // Rechazar
  static async rechazar(id, comentarios) {
    const [result] = await pool.execute(
      `UPDATE aprobaciones 
       SET estado = 'rechazado', comentarios = ?, fecha_accion = NOW()
       WHERE id = ?`,
      [comentarios, id]
    );
    return result.affectedRows > 0;
  }

  // Obtener aprobación pendiente por tipo
  static async obtenerPendientePorTipo(solicitudId, tipoAprobacion) {
    const [rows] = await pool.execute(
      `SELECT * FROM aprobaciones 
       WHERE solicitud_id = ? AND tipo_aprobacion = ? AND estado = 'pendiente'`,
      [solicitudId, tipoAprobacion]
    );
    return rows[0];
  }

  // Verificar si todas las aprobaciones están completas
  static async todasAprobadas(solicitudId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) as aprobadas
       FROM aprobaciones
       WHERE solicitud_id = ?`,
      [solicitudId]
    );
    return rows[0].total === rows[0].aprobadas && rows[0].total > 0;
  }

  // Verificar si hay algún rechazo
  static async hayRechazo(solicitudId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as rechazadas
       FROM aprobaciones
       WHERE solicitud_id = ? AND estado = 'rechazado'`,
      [solicitudId]
    );
    return rows[0].rechazadas > 0;
  }
}

module.exports = Aprobacion;


