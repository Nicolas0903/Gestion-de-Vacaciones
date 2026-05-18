const { pool } = require('../config/database');

/**
 * Modelo de "Rendición de Presupuesto".
 *
 * Es un clon de `Reembolso` con dos diferencias claves:
 *  - tabla `rendiciones_presupuesto` (separada de `solicitudes_reembolso`).
 *  - campo `area` obligatorio (gerencia_general, consultoria, administracion,
 *    operaciones, marketing, comercial).
 *
 * El aprobador es siempre el rol admin (no hay env var configurable).
 */
class RendicionPresupuesto {
  /** Conjunto de áreas válidas. Debe mantenerse en sync con el ENUM de la BD. */
  static AREAS_VALIDAS = [
    'gerencia_general',
    'consultoria',
    'administracion',
    'operaciones',
    'marketing',
    'comercial'
  ];

  /** Etiquetas legibles para UI / emails / PDF. */
  static AREAS_LABEL = {
    gerencia_general: 'Gerencia General',
    consultoria: 'Consultoría',
    administracion: 'Administración',
    operaciones: 'Operaciones',
    marketing: 'Marketing',
    comercial: 'Comercial'
  };

  static codigoTicket(row) {
    const y = row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear();
    return `RDP-${y}-${String(row.id).padStart(5, '0')}`;
  }

  static async crear(datos) {
    const {
      empleado_id,
      fecha_solicitud_usuario,
      area,
      concepto,
      nombre_completo,
      dni,
      tiene_comprobante,
      archivo_comprobante_nombre,
      archivo_comprobante_path,
      archivo_recibo_generado_path,
      monto,
      ruc_proveedor,
      numero_documento
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO rendiciones_presupuesto
       (empleado_id, fecha_solicitud_usuario, area, concepto, nombre_completo, dni, tiene_comprobante,
        archivo_comprobante_nombre, archivo_comprobante_path, archivo_recibo_generado_path,
        monto, ruc_proveedor, numero_documento, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        empleado_id,
        fecha_solicitud_usuario,
        area,
        concepto,
        nombre_completo,
        dni,
        tiene_comprobante,
        archivo_comprobante_nombre || null,
        archivo_comprobante_path || null,
        archivo_recibo_generado_path || null,
        monto != null ? monto : 0,
        ruc_proveedor || null,
        numero_documento || null
      ]
    );
    return result.insertId;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT rp.*, e.email as empleado_email, e.codigo_empleado
       FROM rendiciones_presupuesto rp
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE rp.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async listarPorEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT rp.* FROM rendiciones_presupuesto rp
       WHERE rp.empleado_id = ?
       ORDER BY rp.created_at DESC`,
      [empleadoId]
    );
    return rows;
  }

  static async listarPendientes() {
    const [rows] = await pool.execute(
      `SELECT rp.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos, e.email as empleado_email
       FROM rendiciones_presupuesto rp
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE rp.estado = 'pendiente'
       ORDER BY rp.created_at ASC`
    );
    return rows;
  }

  static async listarTodos(filtros = {}) {
    let q = `
      SELECT rp.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
      FROM rendiciones_presupuesto rp
      JOIN empleados e ON rp.empleado_id = e.id
      WHERE 1=1`;
    const params = [];
    if (filtros.estado) {
      q += ' AND rp.estado = ?';
      params.push(filtros.estado);
    }
    if (filtros.area) {
      q += ' AND rp.area = ?';
      params.push(filtros.area);
    }
    q += ' ORDER BY rp.created_at DESC';
    const [rows] = await pool.execute(q, params);
    return rows;
  }

  static async actualizarArchivoRecibo(id, path) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto SET archivo_recibo_generado_path = ? WHERE id = ?`,
      [path, id]
    );
    return r.affectedRows > 0;
  }

  static async aprobar(id, aprobadorId, comentario = null) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'aprobado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado IN ('pendiente', 'observado')`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async rechazar(id, aprobadorId, comentario) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'rechazado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado IN ('pendiente', 'observado')`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async marcarObservado(id, revisadorId, comentario) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'observado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [revisadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async eliminarPorId(id) {
    const [r] = await pool.execute(`DELETE FROM rendiciones_presupuesto WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }

  static async actualizarPorAdmin(id, datos) {
    const {
      fecha_solicitud_usuario,
      area,
      concepto,
      monto,
      ruc_proveedor,
      numero_documento,
      archivo_comprobante_nombre,
      archivo_comprobante_path
    } = datos;

    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto SET
        fecha_solicitud_usuario = ?,
        area = ?,
        concepto = ?,
        monto = ?,
        ruc_proveedor = ?,
        numero_documento = ?,
        archivo_comprobante_nombre = ?,
        archivo_comprobante_path = ?
       WHERE id = ?`,
      [
        fecha_solicitud_usuario,
        area,
        concepto,
        monto,
        ruc_proveedor || null,
        numero_documento || null,
        archivo_comprobante_nombre || null,
        archivo_comprobante_path || null,
        id
      ]
    );
    return r.affectedRows > 0;
  }
}

module.exports = RendicionPresupuesto;
