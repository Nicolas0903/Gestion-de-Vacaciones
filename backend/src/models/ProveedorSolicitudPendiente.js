const { pool } = require('../config/database');

class ProveedorSolicitudPendiente {
  static async generarCodigo() {
    const y = new Date().getFullYear();
    const [rows] = await pool.execute(
      `SELECT id FROM proveedor_solicitudes_pendientes
       WHERE codigo LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [`SOL-PROV-${y}-%`]
    );
    const seq = rows.length ? rows[0].id + 1 : 1;
    return `SOL-PROV-${y}-${String(seq).padStart(5, '0')}`;
  }

  static async crear(datos) {
    const codigo = await this.generarCodigo();
    const [r] = await pool.execute(
      `INSERT INTO proveedor_solicitudes_pendientes
       (codigo, ruc, detalle, area_solicitante, area_otro, rendicion_presupuesto_id, solicitante_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        codigo,
        datos.ruc,
        datos.detalle,
        datos.area_solicitante,
        datos.area_solicitante === 'otros' ? datos.area_otro || null : null,
        datos.rendicion_presupuesto_id || null,
        datos.solicitante_id
      ]
    );
    return r.insertId;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT s.*,
              e.nombres AS solicitante_nombres, e.apellidos AS solicitante_apellidos,
              rp.concepto AS rendicion_concepto,
              rp.monto AS rendicion_monto, rp.moneda AS rendicion_moneda
       FROM proveedor_solicitudes_pendientes s
       LEFT JOIN empleados e ON s.solicitante_id = e.id
       LEFT JOIN rendiciones_presupuesto rp ON s.rendicion_presupuesto_id = rp.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async listar(filtros = {}) {
    let q = `
      SELECT s.*,
             e.nombres AS solicitante_nombres, e.apellidos AS solicitante_apellidos,
             rp.concepto AS rendicion_concepto
      FROM proveedor_solicitudes_pendientes s
      LEFT JOIN empleados e ON s.solicitante_id = e.id
      LEFT JOIN rendiciones_presupuesto rp ON s.rendicion_presupuesto_id = rp.id
      WHERE 1=1
    `;
    const params = [];
    if (filtros.estado) {
      q += ' AND s.estado = ?';
      params.push(filtros.estado);
    }
    q += ' ORDER BY s.created_at DESC, s.id DESC';
    const [rows] = await pool.execute(q, params);
    return rows;
  }

  static async marcarEnEvaluacion(id, evaluacionId) {
    const [r] = await pool.execute(
      `UPDATE proveedor_solicitudes_pendientes
       SET estado = 'en_evaluacion', evaluacion_id = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [evaluacionId, id]
    );
    return r.affectedRows > 0;
  }

  static async marcarCompletadaPorEvaluacion(evaluacionId, proveedorId) {
    const [r] = await pool.execute(
      `UPDATE proveedor_solicitudes_pendientes
       SET estado = 'completada', proveedor_id = ?
       WHERE evaluacion_id = ? AND estado IN ('pendiente', 'en_evaluacion')`,
      [proveedorId, evaluacionId]
    );
    return r.affectedRows > 0;
  }

  static async buscarPorEvaluacionId(evaluacionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM proveedor_solicitudes_pendientes WHERE evaluacion_id = ? LIMIT 1`,
      [evaluacionId]
    );
    return rows[0];
  }
}

module.exports = ProveedorSolicitudPendiente;
