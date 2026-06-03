const { pool } = require('../config/database');
const { normCliente, claveCliente } = require('../services/consumoFabricPaygParser');

class ConsumoFabricMonto {
  static async listar({ anio, mes, customer } = {}) {
    let sql = `SELECT m.*, CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
               FROM fabric_consumo_montos m
               LEFT JOIN empleados e ON e.id = m.creado_por
               WHERE 1=1`;
    const params = [];
    if (anio) {
      sql += ' AND m.anio = ?';
      params.push(anio);
    }
    if (mes) {
      sql += ' AND m.mes = ?';
      params.push(mes);
    }
    if (customer) {
      sql += ' AND m.customer_name LIKE ?';
      params.push(`%${customer}%`);
    }
    sql += ' ORDER BY m.anio DESC, m.mes DESC, m.customer_name ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async buscarPorClientePeriodo(customerName, mes, anio) {
    const nombre = normCliente(customerName);
    const [rows] = await pool.query(
      `SELECT * FROM fabric_consumo_montos
       WHERE customer_name = ? AND mes = ? AND anio = ?`,
      [nombre, mes, anio]
    );
    if (rows[0]) return rows[0];

    const clave = claveCliente(nombre);
    const [todos] = await pool.query(
      `SELECT * FROM fabric_consumo_montos WHERE mes = ? AND anio = ?`,
      [mes, anio]
    );
    return todos.find((r) => claveCliente(r.customer_name) === clave) || null;
  }

  static async upsert(data, creadoPorId) {
    const customer_name = normCliente(data.customer_name);
    const mes = parseInt(data.mes, 10);
    const anio = parseInt(data.anio, 10);
    const monto = Number(data.monto);
    const moneda = String(data.moneda || 'US$').trim() || 'US$';
    if (!customer_name) throw new Error('Cliente obligatorio');
    if (!mes || mes < 1 || mes > 12) throw new Error('Mes inválido');
    if (!anio) throw new Error('Año inválido');
    if (!Number.isFinite(monto) || monto < 0) throw new Error('Monto inválido');

    await pool.query(
      `INSERT INTO fabric_consumo_montos (customer_name, mes, anio, monto, moneda, notas, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         monto = VALUES(monto),
         moneda = VALUES(moneda),
         notas = VALUES(notas),
         creado_por = VALUES(creado_por)`,
      [
        customer_name,
        mes,
        anio,
        Math.round(monto * 100) / 100,
        moneda,
        data.notas != null ? String(data.notas).trim() : null,
        creadoPorId || null
      ]
    );
    return this.buscarPorClientePeriodo(customer_name, mes, anio);
  }

  static async eliminar(id) {
    const [r] = await pool.query(`DELETE FROM fabric_consumo_montos WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }

  /** Historial de montos del mismo cliente (todas las cargas en BD). */
  static async historicoPorCliente(customerName) {
    const clave = claveCliente(normCliente(customerName));
    const [rows] = await pool.query(
      `SELECT customer_name, mes, anio, monto, moneda
       FROM fabric_consumo_montos ORDER BY anio ASC, mes ASC`
    );
    return rows.filter((r) => claveCliente(r.customer_name) === clave);
  }
}

module.exports = ConsumoFabricMonto;
