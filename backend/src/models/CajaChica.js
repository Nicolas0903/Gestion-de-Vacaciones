const { pool } = require('../config/database');

class CajaChica {
  static async crearPeriodo(anio, mes) {
    const [r] = await pool.execute(
      `INSERT INTO caja_chica_periodos (anio, mes, estado) VALUES (?, ?, 'borrador')`,
      [anio, mes]
    );
    return r.insertId;
  }

  /**
   * Crea período en borrador y, si hay un cierre anterior, deja tres líneas de ingreso:
   * caja chica y depósito en 0 (para completar) y saldo_anterior con el monto del sistema.
   */
  static async crearPeriodoYSembrarSaldoAnterior(anio, mes) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.execute(
        `INSERT INTO caja_chica_periodos (anio, mes, estado) VALUES (?, ?, 'borrador')`,
        [anio, mes]
      );
      const periodoId = ins.insertId;

      const [rows] = await conn.execute(
        `SELECT saldo_cierre FROM caja_chica_periodos
         WHERE estado = 'cerrado'
           AND saldo_cierre IS NOT NULL
           AND (anio < ? OR (anio = ? AND mes < ?))
         ORDER BY anio DESC, mes DESC
         LIMIT 1`,
        [anio, anio, mes]
      );
      const saldoAnt =
        rows[0] && rows[0].saldo_cierre != null ? Number(rows[0].saldo_cierre) : null;

      if (saldoAnt != null) {
        const lineas = [
          { tipo_motivo: 'caja_chica', monto: 0 },
          { tipo_motivo: 'deposito_adicional', monto: 0 },
          { tipo_motivo: 'saldo_anterior', monto: saldoAnt }
        ];
        let orden = 0;
        for (const linea of lineas) {
          await conn.execute(
            `INSERT INTO caja_chica_ingresos (periodo_id, tipo_motivo, monto, orden) VALUES (?, ?, ?, ?)`,
            [periodoId, linea.tipo_motivo, linea.monto, orden++]
          );
        }
      }

      await conn.commit();
      return periodoId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
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

  /**
   * Saldo de cierre del último período cerrado estrictamente anterior a (anio, mes).
   * Permite huecos entre meses: no exige que el mes previo calendario exista.
   */
  static async saldoCierrePeriodoAnterior(anio, mes) {
    const [rows] = await pool.execute(
      `SELECT saldo_cierre FROM caja_chica_periodos
       WHERE estado = 'cerrado'
         AND saldo_cierre IS NOT NULL
         AND (anio < ? OR (anio = ? AND mes < ?))
       ORDER BY anio DESC, mes DESC
       LIMIT 1`,
      [anio, anio, mes]
    );
    if (rows[0] && rows[0].saldo_cierre != null) {
      return Number(rows[0].saldo_cierre);
    }
    return null;
  }
}

module.exports = CajaChica;
