const { pool } = require('../config/database');

function calcularComisionMonto(importe, porcentaje) {
  const imp = Number(importe) || 0;
  const pct = Number(porcentaje) || 0;
  return Math.round(imp * (pct / 100) * 100) / 100;
}

function etiquetaFormaPago(orden) {
  const n = Number(orden) || 1;
  const map = ['', '1er Pago', '2do Pago', '3er Pago', '4to Pago', '5to Pago', '6to Pago'];
  if (n >= 1 && n <= 6) return map[n];
  return `${n}° Pago`;
}

class ComisionPorPagar {
  static async listar() {
    const [rows] = await pool.query(
      `SELECT c.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre,
              (SELECT COUNT(*) FROM comisiones_pagos p WHERE p.comision_id = c.id) AS total_pagos,
              (SELECT COALESCE(SUM(p.importe), 0) FROM comisiones_pagos p WHERE p.comision_id = c.id) AS suma_importes,
              (SELECT COALESCE(SUM(p.comision_monto), 0) FROM comisiones_pagos p WHERE p.comision_id = c.id) AS suma_comisiones
       FROM comisiones_por_pagar c
       LEFT JOIN empleados e ON e.id = c.creado_por
       ORDER BY c.updated_at DESC, c.id DESC`
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT c.*, CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
       FROM comisiones_por_pagar c
       LEFT JOIN empleados e ON e.id = c.creado_por
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async listarPagos(comisionId) {
    const [rows] = await pool.query(
      `SELECT * FROM comisiones_pagos WHERE comision_id = ? ORDER BY orden ASC, id ASC`,
      [comisionId]
    );
    return rows;
  }

  static async obtenerDetalle(id) {
    const comision = await this.buscarPorId(id);
    if (!comision) return null;
    const pagos = await this.listarPagos(id);
    return { comision, pagos };
  }

  static validarEncabezado(data) {
    const vendedor = String(data.vendedor || '').trim();
    const cliente = String(data.cliente || '').trim();
    const valor = Number(data.valor_servicio);
    const pct = Number(data.porcentaje_comision);
    if (!vendedor) throw new Error('El vendedor es obligatorio');
    if (!cliente) throw new Error('El cliente es obligatorio');
    if (!Number.isFinite(valor) || valor < 0) throw new Error('Valor del servicio inválido');
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new Error('Porcentaje de comisión debe estar entre 0 y 100');
    }
    return {
      vendedor,
      cliente,
      valor_servicio: Math.round(valor * 100) / 100,
      porcentaje_comision: Math.round(pct * 100) / 100,
      condiciones_pago: data.condiciones_pago != null ? String(data.condiciones_pago).trim() : null,
      estado: ['borrador', 'activo', 'cerrado'].includes(data.estado) ? data.estado : 'activo'
    };
  }

  static async crear(data, creadoPorId) {
    const v = this.validarEncabezado(data);
    const [result] = await pool.query(
      `INSERT INTO comisiones_por_pagar
        (vendedor, cliente, valor_servicio, porcentaje_comision, condiciones_pago, estado, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        v.vendedor,
        v.cliente,
        v.valor_servicio,
        v.porcentaje_comision,
        v.condiciones_pago,
        v.estado,
        creadoPorId || null
      ]
    );
    return this.obtenerDetalle(result.insertId);
  }

  static async actualizar(id, data) {
    const actual = await this.buscarPorId(id);
    if (!actual) return null;
    const v = this.validarEncabezado({ ...actual, ...data });
    await pool.query(
      `UPDATE comisiones_por_pagar SET
        vendedor = ?, cliente = ?, valor_servicio = ?, porcentaje_comision = ?,
        condiciones_pago = ?, estado = ?
       WHERE id = ?`,
      [
        v.vendedor,
        v.cliente,
        v.valor_servicio,
        v.porcentaje_comision,
        v.condiciones_pago,
        v.estado,
        id
      ]
    );
    if (Number(v.porcentaje_comision) !== Number(actual.porcentaje_comision)) {
      await this.recalcularComisionesPagos(id, v.porcentaje_comision);
    }
    return this.obtenerDetalle(id);
  }

  static async recalcularComisionesPagos(comisionId, porcentaje) {
    const pagos = await this.listarPagos(comisionId);
    for (const p of pagos) {
      const monto = calcularComisionMonto(p.importe, porcentaje);
      await pool.query(`UPDATE comisiones_pagos SET comision_monto = ? WHERE id = ?`, [
        monto,
        p.id
      ]);
    }
  }

  static async eliminar(id) {
    const [r] = await pool.query(`DELETE FROM comisiones_por_pagar WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }

  static validarPago(data, porcentajeComision) {
    const importe = Number(data.importe);
    if (!Number.isFinite(importe) || importe < 0) throw new Error('Importe inválido');
    const orden = parseInt(data.orden, 10);
    const forma =
      String(data.forma || '').trim() ||
      etiquetaFormaPago(Number.isFinite(orden) && orden > 0 ? orden : 1);
    return {
      orden: Number.isFinite(orden) && orden > 0 ? orden : 1,
      forma,
      importe: Math.round(importe * 100) / 100,
      no_factura: data.no_factura != null ? String(data.no_factura).trim() : null,
      fecha_emision_factura: data.fecha_emision_factura || null,
      comision_monto: calcularComisionMonto(importe, porcentajeComision),
      fecha_pago: data.fecha_pago || null,
      firma: data.firma != null ? String(data.firma).trim() : null,
      observaciones: data.observaciones != null ? String(data.observaciones).trim() : null
    };
  }

  static async crearPago(comisionId, data) {
    const comision = await this.buscarPorId(comisionId);
    if (!comision) throw new Error('Comisión no encontrada');
    const v = this.validarPago(data, comision.porcentaje_comision);
    const [result] = await pool.query(
      `INSERT INTO comisiones_pagos
        (comision_id, orden, forma, importe, no_factura, fecha_emision_factura,
         comision_monto, fecha_pago, firma, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comisionId,
        v.orden,
        v.forma,
        v.importe,
        v.no_factura,
        v.fecha_emision_factura,
        v.comision_monto,
        v.fecha_pago,
        v.firma,
        v.observaciones
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM comisiones_pagos WHERE id = ?`, [result.insertId]);
    return rows[0];
  }

  static async actualizarPago(comisionId, pagoId, data) {
    const comision = await this.buscarPorId(comisionId);
    if (!comision) throw new Error('Comisión no encontrada');
    const [exist] = await pool.query(
      `SELECT * FROM comisiones_pagos WHERE id = ? AND comision_id = ?`,
      [pagoId, comisionId]
    );
    if (!exist.length) throw new Error('Pago no encontrado');
    const v = this.validarPago({ ...exist[0], ...data }, comision.porcentaje_comision);
    await pool.query(
      `UPDATE comisiones_pagos SET
        orden = ?, forma = ?, importe = ?, no_factura = ?, fecha_emision_factura = ?,
        comision_monto = ?, fecha_pago = ?, firma = ?, observaciones = ?
       WHERE id = ? AND comision_id = ?`,
      [
        v.orden,
        v.forma,
        v.importe,
        v.no_factura,
        v.fecha_emision_factura,
        v.comision_monto,
        v.fecha_pago,
        v.firma,
        v.observaciones,
        pagoId,
        comisionId
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM comisiones_pagos WHERE id = ?`, [pagoId]);
    return rows[0];
  }

  static async eliminarPago(comisionId, pagoId) {
    const [r] = await pool.query(`DELETE FROM comisiones_pagos WHERE id = ? AND comision_id = ?`, [
      pagoId,
      comisionId
    ]);
    return r.affectedRows > 0;
  }

  static async siguienteOrden(comisionId) {
    const [rows] = await pool.query(
      `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden FROM comisiones_pagos WHERE comision_id = ?`,
      [comisionId]
    );
    return rows[0]?.next_orden || 1;
  }
}

module.exports = ComisionPorPagar;
