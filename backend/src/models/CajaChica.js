const { pool } = require('../config/database');

class CajaChica {
  static async crearPeriodo(anio, mes) {
    const [r] = await pool.execute(
      `INSERT INTO caja_chica_periodos (anio, mes, estado) VALUES (?, ?, 'borrador')`,
      [anio, mes]
    );
    return r.insertId;
  }

  static async buscarPeriodoPorId(id) {
    const [rows] = await pool.execute(`SELECT * FROM caja_chica_periodos WHERE id = ?`, [id]);
    return rows[0];
  }

  static async buscarPeriodoPorAnioMes(anio, mes) {
    const [rows] = await pool.execute(
      `SELECT * FROM caja_chica_periodos WHERE anio = ? AND mes = ?`,
      [anio, mes]
    );
    return rows[0];
  }

  static async listarPeriodos() {
    const [rows] = await pool.execute(
      `SELECT * FROM caja_chica_periodos ORDER BY anio DESC, mes DESC`
    );
    return rows;
  }

  static async listarIngresos(periodoId) {
    const [rows] = await pool.execute(
      `SELECT * FROM caja_chica_ingresos WHERE periodo_id = ? ORDER BY orden ASC, id ASC`,
      [periodoId]
    );
    return rows;
  }

  static async reemplazarIngresos(periodoId, lineas) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`DELETE FROM caja_chica_ingresos WHERE periodo_id = ?`, [periodoId]);
      let orden = 0;
      for (const linea of lineas) {
        const monto = linea.monto != null ? parseFloat(linea.monto, 10) : 0;
        if (Number.isNaN(monto)) {
          throw new Error('Monto inválido');
        }
        const tipos = ['caja_chica', 'deposito_adicional', 'saldo_anterior'];
        if (!tipos.includes(linea.tipo_motivo)) {
          throw new Error('tipo_motivo no válido');
        }
        await conn.execute(
          `INSERT INTO caja_chica_ingresos (periodo_id, tipo_motivo, monto, orden) VALUES (?, ?, ?, ?)`,
          [periodoId, linea.tipo_motivo, monto, orden++]
        );
      }
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async cerrarPeriodo(periodoId, saldoCierre) {
    const [r] = await pool.execute(
      `UPDATE caja_chica_periodos
       SET estado = 'cerrado', saldo_cierre = ?
       WHERE id = ? AND estado = 'borrador'`,
      [saldoCierre, periodoId]
    );
    return r.affectedRows > 0;
  }

  /** Vuelve a borrador (casos excepcionales). Limpia saldo de cierre. */
  static async reabrirPeriodo(periodoId) {
    const [r] = await pool.execute(
      `UPDATE caja_chica_periodos
       SET estado = 'borrador', saldo_cierre = NULL
       WHERE id = ? AND estado = 'cerrado'`,
      [periodoId]
    );
    return r.affectedRows > 0;
  }

  /** Último período cerrado anterior al (anio, mes); devuelve saldo_cierre o null */
  static async saldoCierrePeriodoAnterior(anio, mes) {
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAnio = mes === 1 ? anio - 1 : anio;
    const [rows] = await pool.execute(
      `SELECT saldo_cierre FROM caja_chica_periodos
       WHERE estado = 'cerrado' AND anio = ? AND mes = ?`,
      [prevAnio, prevMes]
    );
    if (rows[0] && rows[0].saldo_cierre != null) {
      return Number(rows[0].saldo_cierre);
    }
    return null;
  }
}

module.exports = CajaChica;
