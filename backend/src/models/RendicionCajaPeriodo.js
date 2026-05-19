const { pool } = require('../config/database');

class RendicionCajaPeriodo {
  static async crearPeriodo(anio, mes) {
    const [r] = await pool.execute(
      `INSERT INTO rendicion_caja_periodos (anio, mes, estado) VALUES (?, ?, 'borrador')`,
      [anio, mes]
    );
    return r.insertId;
  }

  static async buscarPeriodoPorId(id) {
    const [rows] = await pool.execute(`SELECT * FROM rendicion_caja_periodos WHERE id = ?`, [id]);
    return rows[0];
  }

  static async buscarPeriodoPorAnioMes(anio, mes) {
    const [rows] = await pool.execute(
      `SELECT * FROM rendicion_caja_periodos WHERE anio = ? AND mes = ?`,
      [anio, mes]
    );
    return rows[0];
  }

  static async listarPeriodos() {
    const [rows] = await pool.execute(
      `SELECT * FROM rendicion_caja_periodos ORDER BY anio DESC, mes DESC`
    );
    return rows;
  }

  static async cerrarPeriodo(periodoId, totalCierre) {
    const [r] = await pool.execute(
      `UPDATE rendicion_caja_periodos
       SET estado = 'cerrado', total_cierre = ?
       WHERE id = ? AND estado = 'borrador'`,
      [totalCierre, periodoId]
    );
    return r.affectedRows > 0;
  }

  static async reabrirPeriodo(periodoId) {
    const [r] = await pool.execute(
      `UPDATE rendicion_caja_periodos
       SET estado = 'borrador', total_cierre = NULL
       WHERE id = ? AND estado = 'cerrado'`,
      [periodoId]
    );
    return r.affectedRows > 0;
  }
}

module.exports = RendicionCajaPeriodo;
