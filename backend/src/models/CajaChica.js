const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const ADJUNTO_DIR = path.join(__dirname, '../../uploads/caja-chica-ingresos');

/** Devuelve YYYY-MM-DD o null (acepta ISO, DD/MM/AAAA, fechas MySQL/JS). */
function normalizarFechaDeposito(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const pe = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (pe) {
    const d = pe[1].padStart(2, '0');
    const mo = pe[2].padStart(2, '0');
    return `${pe[3]}-${mo}-${d}`;
  }
  return null;
}

function parseFechaDeposito(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = normalizarFechaDeposito(v);
  if (n == null) {
    throw new Error('fecha_deposito debe ser YYYY-MM-DD, DD/MM/AAAA o estar vacío');
  }
  return n;
}

function unlinkComprobanteSeguro(basename) {
  if (!basename || basename.includes('/') || basename.includes('\\')) return;
  const full = path.join(ADJUNTO_DIR, basename);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (_) {
    /* ignore */
  }
}

class CajaChica {
  /** Para respuestas API (evita slice(0,10) sobre Date o strings raros de meses viejos). */
  static normalizarFechaDepositoApi(v) {
    return normalizarFechaDeposito(v);
  }

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
    return this.sincronizarIngresos(periodoId, lineas);
  }

  /** Sincroniza filas conservando ids y adjuntos; elimina filas quitadas y sus archivos. */
  static async sincronizarIngresos(periodoId, lineas) {
    if (!Array.isArray(lineas)) {
      throw new Error('ingresos debe ser un arreglo');
    }
    if (!fs.existsSync(ADJUNTO_DIR)) {
      fs.mkdirSync(ADJUNTO_DIR, { recursive: true });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existingRows] = await conn.execute(
        `SELECT id, comprobante_archivo FROM caja_chica_ingresos WHERE periodo_id = ?`,
        [periodoId]
      );

      const incomingIds = new Set(
        lineas.filter((l) => l.id != null && l.id !== '').map((l) => Number(l.id))
      );

      const toRemove = existingRows.filter((r) => !incomingIds.has(Number(r.id)));
      for (const r of toRemove) {
        unlinkComprobanteSeguro(r.comprobante_archivo);
      }

      if (toRemove.length > 0) {
        const ids = toRemove.map((r) => r.id);
        const ph = ids.map(() => '?').join(',');
        await conn.execute(`DELETE FROM caja_chica_ingresos WHERE periodo_id = ? AND id IN (${ph})`, [
          periodoId,
          ...ids
        ]);
      }

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
        const fechaDep = parseFechaDeposito(linea.fecha_deposito);

        if (linea.id != null && linea.id !== '') {
          const idNum = Number(linea.id);
          const [upd] = await conn.execute(
            `UPDATE caja_chica_ingresos SET tipo_motivo = ?, monto = ?, fecha_deposito = ?, orden = ?
             WHERE id = ? AND periodo_id = ?`,
            [linea.tipo_motivo, monto, fechaDep, orden++, idNum, periodoId]
          );
          if (upd.affectedRows === 0) {
            throw new Error('Línea de ingreso no encontrada o no pertenece al período');
          }
        } else {
          await conn.execute(
            `INSERT INTO caja_chica_ingresos (periodo_id, tipo_motivo, monto, fecha_deposito, orden)
             VALUES (?, ?, ?, ?, ?)`,
            [periodoId, linea.tipo_motivo, monto, fechaDep, orden++]
          );
        }
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

  static async obtenerIngresoPorIdEnPeriodo(ingresoId, periodoId) {
    const [rows] = await pool.execute(
      `SELECT * FROM caja_chica_ingresos WHERE id = ? AND periodo_id = ?`,
      [ingresoId, periodoId]
    );
    return rows[0];
  }

  static async actualizarComprobanteIngreso(ingresoId, periodoId, nombreArchivo) {
    const [r] = await pool.execute(
      `UPDATE caja_chica_ingresos SET comprobante_archivo = ?
       WHERE id = ? AND periodo_id = ?`,
      [nombreArchivo, ingresoId, periodoId]
    );
    return r.affectedRows > 0;
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

  static eliminarArchivoComprobante(basename) {
    unlinkComprobanteSeguro(basename);
  }

  static async limpiarComprobanteIngreso(ingresoId, periodoId) {
    const ing = await this.obtenerIngresoPorIdEnPeriodo(ingresoId, periodoId);
    if (!ing) return false;
    unlinkComprobanteSeguro(ing.comprobante_archivo);
    const [r] = await pool.execute(
      `UPDATE caja_chica_ingresos SET comprobante_archivo = NULL WHERE id = ? AND periodo_id = ?`,
      [ingresoId, periodoId]
    );
    return r.affectedRows > 0;
  }
}

module.exports = CajaChica;
