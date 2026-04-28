const { pool } = require('../config/database');

class Reembolso {
  static codigoTicket(row) {
    const y = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
    return `RMB-${y}-${String(row.id).padStart(5, '0')}`;
  }

  static async crear(datos) {
    const {
      empleado_id,
      fecha_solicitud_usuario,
      concepto,
      nombre_completo,
      dni,
      tiene_comprobante,
      archivo_comprobante_nombre,
      archivo_comprobante_path,
      archivo_recibo_generado_path,
      metodo_reembolso,
      celular,
      nombre_en_metodo,
      numero_cuenta,
      monto
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO solicitudes_reembolso
       (empleado_id, fecha_solicitud_usuario, concepto, nombre_completo, dni, tiene_comprobante,
        archivo_comprobante_nombre, archivo_comprobante_path, archivo_recibo_generado_path,
        metodo_reembolso, celular, nombre_en_metodo, numero_cuenta, monto, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        empleado_id,
        fecha_solicitud_usuario,
        concepto,
        nombre_completo,
        dni,
        tiene_comprobante,
        archivo_comprobante_nombre || null,
        archivo_comprobante_path || null,
        archivo_recibo_generado_path || null,
        metodo_reembolso,
        celular,
        nombre_en_metodo,
        numero_cuenta || null,
        monto != null ? monto : 0
      ]
    );
    return result.insertId;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT sr.*, e.email as empleado_email, e.codigo_empleado
       FROM solicitudes_reembolso sr
       JOIN empleados e ON sr.empleado_id = e.id
       WHERE sr.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async listarPorEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT sr.* FROM solicitudes_reembolso sr
       WHERE sr.empleado_id = ?
       ORDER BY sr.created_at DESC`,
      [empleadoId]
    );
    return rows;
  }

  static async listarPendientes() {
    const [rows] = await pool.execute(
      `SELECT sr.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos, e.email as empleado_email
       FROM solicitudes_reembolso sr
       JOIN empleados e ON sr.empleado_id = e.id
       WHERE sr.estado = 'pendiente'
       ORDER BY sr.created_at ASC`
    );
    return rows;
  }

  static async listarTodos(filtros = {}) {
    let q = `
      SELECT sr.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
      FROM solicitudes_reembolso sr
      JOIN empleados e ON sr.empleado_id = e.id
      WHERE 1=1`;
    const params = [];
    if (filtros.estado) {
      q += ' AND sr.estado = ?';
      params.push(filtros.estado);
    }
    q += ' ORDER BY sr.created_at DESC';
    const [rows] = await pool.execute(q, params);
    return rows;
  }

  static async actualizarArchivoRecibo(id, path) {
    const [r] = await pool.execute(
      `UPDATE solicitudes_reembolso SET archivo_recibo_generado_path = ? WHERE id = ?`,
      [path, id]
    );
    return r.affectedRows > 0;
  }

  static async aprobar(id, aprobadorId, comentario = null) {
    const [r] = await pool.execute(
      `UPDATE solicitudes_reembolso
       SET estado = 'aprobado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async rechazar(id, aprobadorId, comentario) {
    const [r] = await pool.execute(
      `UPDATE solicitudes_reembolso
       SET estado = 'rechazado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }
}

module.exports = Reembolso;
