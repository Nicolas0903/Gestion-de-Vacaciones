const { pool } = require('../config/database');
const RendicionPresupuesto = require('./RendicionPresupuesto');

class SolicitudPresupuesto {
  static ESTADOS = ['borrador', 'pendiente', 'aprobada', 'rechazada', 'cancelada'];

  static async generarCodigo() {
    const year = new Date().getFullYear();
    const prefix = `SOL-PRE-${year}-`;
    const [rows] = await pool.query(
      `SELECT codigo FROM solicitudes_presupuesto WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let n = 1;
    if (rows[0]?.codigo) {
      const m = String(rows[0].codigo).match(/-(\d+)$/);
      if (m) n = Number(m[1]) + 1;
    }
    return `${prefix}${String(n).padStart(3, '0')}`;
  }

  static enriquecer(row, extra = {}) {
    if (!row) return null;
    const moneda = RendicionPresupuesto.normalizarMoneda(row.moneda);
    return {
      ...row,
      ...extra,
      moneda,
      moneda_label: RendicionPresupuesto.MONEDA_LABEL[moneda],
      area_label: RendicionPresupuesto.AREAS_LABEL[row.area] || row.area,
      monto_solicitado_formateado: RendicionPresupuesto.formatearMonto(row.monto_solicitado, moneda),
      monto_aprobado_formateado:
        row.monto_aprobado != null
          ? RendicionPresupuesto.formatearMonto(row.monto_aprobado, moneda)
          : null
    };
  }

  static async montoComprometido(solicitudId) {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM rendiciones_presupuesto
       WHERE solicitud_presupuesto_id = ?
         AND estado IN ('pendiente', 'aprobado', 'observado')`,
      [solicitudId]
    );
    return Number(rows[0]?.total || 0);
  }

  static async crear(empleadoId, datos) {
    const codigo = await this.generarCodigo();
    const [result] = await pool.execute(
      `INSERT INTO solicitudes_presupuesto
        (codigo, empleado_id, area, concepto, justificacion, monto_solicitado, moneda, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        empleadoId,
        datos.area,
        datos.concepto,
        datos.justificacion || null,
        datos.monto_solicitado,
        RendicionPresupuesto.normalizarMoneda(datos.moneda),
        datos.estado || 'borrador'
      ]
    );
    return result.insertId;
  }

  static async actualizar(id, empleadoId, datos, { staff = false } = {}) {
    const actual = await this.buscarPorId(id);
    if (!actual) return false;
    if (!staff && actual.empleado_id !== empleadoId) return false;
    if (!staff && !['borrador', 'pendiente'].includes(actual.estado) && datos.estado !== 'cancelada') {
      return false;
    }

    const [r] = await pool.execute(
      `UPDATE solicitudes_presupuesto SET
        area = COALESCE(?, area),
        concepto = COALESCE(?, concepto),
        justificacion = COALESCE(?, justificacion),
        monto_solicitado = COALESCE(?, monto_solicitado),
        moneda = COALESCE(?, moneda),
        estado = COALESCE(?, estado)
       WHERE id = ?`,
      [
        datos.area ?? null,
        datos.concepto ?? null,
        datos.justificacion ?? null,
        datos.monto_solicitado ?? null,
        datos.moneda ? RendicionPresupuesto.normalizarMoneda(datos.moneda) : null,
        datos.estado ?? null,
        id
      ]
    );
    return r.affectedRows > 0;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT sp.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS solicitante_nombre,
              e.email AS solicitante_email,
              CONCAT(ap.nombres, ' ', ap.apellidos) AS aprobador_nombre
       FROM solicitudes_presupuesto sp
       JOIN empleados e ON sp.empleado_id = e.id
       LEFT JOIN empleados ap ON sp.aprobado_por = ap.id
       WHERE sp.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async listarPorEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT sp.* FROM solicitudes_presupuesto sp
       WHERE sp.empleado_id = ?
       ORDER BY sp.created_at DESC`,
      [empleadoId]
    );
    return rows;
  }

  static async listarPendientesAprobacion() {
    const [rows] = await pool.execute(
      `SELECT sp.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS solicitante_nombre,
              e.email AS solicitante_email
       FROM solicitudes_presupuesto sp
       JOIN empleados e ON sp.empleado_id = e.id
       WHERE sp.estado = 'pendiente'
       ORDER BY sp.created_at ASC`
    );
    return rows;
  }

  static async listarAprobadasParaRendicion(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT sp.* FROM solicitudes_presupuesto sp
       WHERE sp.empleado_id = ? AND sp.estado = 'aprobada'
       ORDER BY sp.fecha_resolucion DESC, sp.id DESC`,
      [empleadoId]
    );
    const out = [];
    for (const row of rows) {
      const usado = await this.montoComprometido(row.id);
      const tope = Number(row.monto_aprobado ?? row.monto_solicitado);
      const saldo = Math.max(0, tope - usado);
      out.push(
        this.enriquecer(row, {
          monto_comprometido: usado,
          monto_saldo: saldo,
          monto_tope: tope
        })
      );
    }
    return out.filter((s) => s.monto_saldo > 0.009);
  }

  static async marcarEnviada(id) {
    const [r] = await pool.execute(
      `UPDATE solicitudes_presupuesto SET estado = 'pendiente' WHERE id = ? AND estado = 'borrador'`,
      [id]
    );
    return r.affectedRows > 0;
  }

  static async resolver(id, { aprobada, aprobadorId, monto_aprobado, comentarios }) {
    const estado = aprobada ? 'aprobada' : 'rechazada';
    const [r] = await pool.execute(
      `UPDATE solicitudes_presupuesto SET
        estado = ?,
        aprobado_por = ?,
        monto_aprobado = ?,
        comentarios_resolucion = ?,
        fecha_resolucion = CURRENT_TIMESTAMP
       WHERE id = ? AND estado = 'pendiente'`,
      [estado, aprobadorId, monto_aprobado ?? null, comentarios || null, id]
    );
    return r.affectedRows > 0;
  }

  static async cancelar(id, empleadoId) {
    const [r] = await pool.execute(
      `UPDATE solicitudes_presupuesto SET estado = 'cancelada'
       WHERE id = ? AND empleado_id = ? AND estado IN ('borrador', 'pendiente')`,
      [id, empleadoId]
    );
    return r.affectedRows > 0;
  }

  static async validarParaRendicion(solicitudId, empleadoId, montoRendicion) {
    const sp = await this.buscarPorId(solicitudId);
    if (!sp) return { ok: false, mensaje: 'Solicitud de presupuesto no encontrada.' };
    if (sp.empleado_id !== empleadoId) {
      return { ok: false, mensaje: 'La solicitud no pertenece a su usuario.' };
    }
    if (sp.estado !== 'aprobada') {
      return { ok: false, mensaje: 'La solicitud de presupuesto no está aprobada.' };
    }
    const usado = await this.montoComprometido(solicitudId);
    const tope = Number(sp.monto_aprobado ?? sp.monto_solicitado);
    if (usado + Number(montoRendicion) > tope + 0.001) {
      return {
        ok: false,
        mensaje: `El monto supera el saldo disponible del presupuesto (${RendicionPresupuesto.formatearMonto(
          tope - usado,
          sp.moneda
        )}).`
      };
    }
    return { ok: true, solicitud: sp };
  }
}

module.exports = SolicitudPresupuesto;
