const { pool } = require('../config/database');
const {
  CRITERIOS_SELECCION_REEVAL,
  CONFORMIDAD_REEVAL,
  calcularPuntajeReeval,
  calcularResultadoReeval,
  diasHasta,
  RESULTADO_REEVAL_LABEL
} = require('../constants/proveedoresCatalogos');

const CRITERIO_VALUES = new Set(CRITERIOS_SELECCION_REEVAL.map((c) => c.value));

class ReevaluacionProveedor {
  static enriquecer(row) {
    if (!row) return null;
    const puntaje = calcularPuntajeReeval(row);
    const resultado = calcularResultadoReeval(puntaje);
    return {
      ...row,
      proveedor_nombre: row.proveedor_razon_social || row.razon_social,
      puntaje,
      resultado,
      resultado_label: RESULTADO_REEVAL_LABEL[resultado] || resultado,
      tiempo_restante_dias: diasHasta(row.proxima_revaluacion)
    };
  }

  static validar(datos) {
    if (!datos.proveedor_id) return 'Seleccione un proveedor de la lista';
    if (!datos.producto_servicio?.trim()) return 'Producto o servicio requerido';
    if (!CRITERIO_VALUES.has(datos.criterio_seleccion)) return 'Criterio de selección no válido';
    if (!['si', 'no'].includes(datos.conformidad)) return 'Conformidad debe ser Sí o No';
    if (!datos.fecha_revaluacion) return 'Fecha de revaluación requerida';
    const hab = Number(datos.puntaje_habido);
    if (![0, 10].includes(hab)) return 'Condición de habido: puntaje 10 o 0';
    const ent = Number(datos.puntaje_entrega_efectiva);
    if (Number.isNaN(ent) || ent < 0 || ent > 10) {
      return 'Entrega efectiva: puntaje entre 0 y 10';
    }
    const pre = Number(datos.puntaje_precio_mercado);
    if (![0, 5].includes(pre)) return 'Precio en mercado: puntaje 0 o 5';
    return null;
  }

  static async listar(filtros = {}) {
    let q = `
      SELECT r.*, p.razon_social AS proveedor_razon_social
      FROM reevaluaciones_proveedor r
      JOIN proveedores p ON r.proveedor_id = p.id
      WHERE p.activo = 1
    `;
    const params = [];
    if (filtros.proveedor_id) {
      q += ` AND r.proveedor_id = ?`;
      params.push(filtros.proveedor_id);
    }
    if (filtros.q) {
      q += ` AND (p.razon_social LIKE ? OR r.producto_servicio LIKE ?)`;
      const t = `%${filtros.q}%`;
      params.push(t, t);
    }
    q += ` ORDER BY r.fecha_revaluacion DESC, r.id DESC`;
    const [rows] = await pool.execute(q, params);
    return rows.map((r) => this.enriquecer(r));
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT r.*, p.razon_social AS proveedor_razon_social
       FROM reevaluaciones_proveedor r
       JOIN proveedores p ON r.proveedor_id = p.id
       WHERE r.id = ?`,
      [id]
    );
    return this.enriquecer(rows[0]);
  }

  static async crear(datos, creadoPor) {
    const err = this.validar(datos);
    if (err) throw new Error(err);
    const [r] = await pool.execute(
      `INSERT INTO reevaluaciones_proveedor
       (proveedor_id, producto_servicio, criterio_seleccion, fecha_ultima_interaccion,
        conformidad, fecha_revaluacion, puntaje_habido, puntaje_entrega_efectiva,
        puntaje_precio_mercado, proxima_revaluacion, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.proveedor_id,
        datos.producto_servicio.trim(),
        datos.criterio_seleccion,
        datos.fecha_ultima_interaccion || null,
        datos.conformidad,
        datos.fecha_revaluacion,
        Number(datos.puntaje_habido),
        Number(datos.puntaje_entrega_efectiva),
        Number(datos.puntaje_precio_mercado),
        datos.proxima_revaluacion || null,
        creadoPor || null
      ]
    );
    return r.insertId;
  }

  static async actualizar(id, datos) {
    const err = this.validar(datos);
    if (err) throw new Error(err);
    const [r] = await pool.execute(
      `UPDATE reevaluaciones_proveedor SET
         proveedor_id = ?, producto_servicio = ?, criterio_seleccion = ?,
         fecha_ultima_interaccion = ?, conformidad = ?, fecha_revaluacion = ?,
         puntaje_habido = ?, puntaje_entrega_efectiva = ?, puntaje_precio_mercado = ?,
         proxima_revaluacion = ?
       WHERE id = ?`,
      [
        datos.proveedor_id,
        datos.producto_servicio.trim(),
        datos.criterio_seleccion,
        datos.fecha_ultima_interaccion || null,
        datos.conformidad,
        datos.fecha_revaluacion,
        Number(datos.puntaje_habido),
        Number(datos.puntaje_entrega_efectiva),
        Number(datos.puntaje_precio_mercado),
        datos.proxima_revaluacion || null,
        id
      ]
    );
    return r.affectedRows > 0;
  }

  static async eliminar(id) {
    const [r] = await pool.execute(`DELETE FROM reevaluaciones_proveedor WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }
}

module.exports = ReevaluacionProveedor;
