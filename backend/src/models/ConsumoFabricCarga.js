const { pool } = require('../config/database');
const { normCliente, claveCliente } = require('../services/consumoFabricPaygParser');

class ConsumoFabricCarga {
  static async listar() {
    const [rows] = await pool.query(
      `SELECT c.id, c.customer_name, c.customer_domain, c.mes, c.anio,
              c.periodo_inicio, c.periodo_fin, c.total_filas, c.archivo_nombre, c.created_at,
              CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
       FROM fabric_consumo_cargas c
       LEFT JOIN empleados e ON e.id = c.creado_por
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT c.*, CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
       FROM fabric_consumo_cargas c
       LEFT JOIN empleados e ON e.id = c.creado_por
       WHERE c.id = ?`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    if (typeof row.reporte_json === 'string') {
      try {
        row.reporte_json = JSON.parse(row.reporte_json);
      } catch (_) {
        row.reporte_json = {};
      }
    }
    return row;
  }

  static async crear(data) {
    const [result] = await pool.query(
      `INSERT INTO fabric_consumo_cargas (
        customer_name, customer_domain, customer_country, codigo_ingram, reseller,
        periodo_inicio, periodo_fin, mes, anio, archivo_nombre, archivo_path,
        total_filas, reporte_json, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.customer_name,
        data.customer_domain,
        data.customer_country,
        data.codigo_ingram,
        data.reseller,
        data.periodo_inicio,
        data.periodo_fin,
        data.mes,
        data.anio,
        data.archivo_nombre,
        data.archivo_path,
        data.total_filas,
        JSON.stringify(data.reporte_json),
        data.creado_por
      ]
    );
    return this.buscarPorId(result.insertId);
  }

  static async eliminar(id) {
    const row = await this.buscarPorId(id);
    if (!row) return null;
    await pool.query(`DELETE FROM fabric_consumo_cargas WHERE id = ?`, [id]);
    return row;
  }

  /** Periodos únicos con reporte de consumo (para asignar montos). */
  static async listarPeriodosParaMontos() {
    const [rows] = await pool.query(
      `SELECT c.id AS carga_id, c.customer_name, c.mes, c.anio, c.total_filas, c.created_at
       FROM fabric_consumo_cargas c
       ORDER BY c.anio DESC, c.mes DESC, c.created_at DESC`
    );
    const vistos = new Set();
    const periodos = [];
    for (const r of rows) {
      const key = `${claveCliente(r.customer_name)}|${r.mes}|${r.anio}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      periodos.push(r);
    }
    return periodos;
  }

  /** CU horas por mes/año de cargas PAYG del mismo cliente. */
  static async historicoCuPorCliente(customerName) {
    const clave = claveCliente(normCliente(customerName));
    const [rows] = await pool.query(
      `SELECT customer_name, mes, anio, reporte_json
       FROM fabric_consumo_cargas ORDER BY anio ASC, mes ASC`
    );
    return rows
      .filter((r) => claveCliente(r.customer_name) === clave)
      .map((r) => {
        let json = r.reporte_json;
        if (typeof json === 'string') {
          try {
            json = JSON.parse(json);
          } catch (_) {
            json = {};
          }
        }
        return {
          mes: r.mes,
          anio: r.anio,
          totalCuHoras: Number(json?.resumen?.totalCuHoras) || 0
        };
      });
  }
}

module.exports = ConsumoFabricCarga;
