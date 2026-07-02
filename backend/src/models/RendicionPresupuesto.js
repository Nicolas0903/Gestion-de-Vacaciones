const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const DEPOSITO_ADJ_DIR = path.join(__dirname, '../../uploads/rendiciones-presupuesto/depositos');

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

function unlinkDepositoSeguro(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {
    /* ignore */
  }
}

/**
 * Modelo de "Rendición de Presupuesto".
 *
 * Es un clon de `Reembolso` con dos diferencias claves:
 *  - tabla `rendiciones_presupuesto` (separada de `solicitudes_reembolso`).
 *  - campo `area` obligatorio (gerencia_general, consultoria, administracion,
 *    operaciones, marketing, comercial).
 *
 * El aprobador es siempre el rol admin (no hay env var configurable).
 */
class RendicionPresupuesto {
  /** Conjunto de áreas válidas. Debe mantenerse en sync con el ENUM de la BD. */
  static AREAS_VALIDAS = [
    'gerencia_general',
    'consultoria',
    'administracion',
    'operaciones',
    'marketing',
    'comercial'
  ];

  /** Etiquetas legibles para UI / emails / PDF. */
  static AREAS_LABEL = {
    gerencia_general: 'Gerencia General',
    consultoria: 'Consultoría',
    administracion: 'Administración',
    operaciones: 'Operaciones',
    marketing: 'Marketing',
    comercial: 'Comercial'
  };

  static MONEDAS_VALIDAS = ['PEN', 'USD'];

  static MONEDA_LABEL = {
    PEN: 'Soles',
    USD: 'Dólares'
  };

  static normalizarMoneda(v) {
    const m = String(v || 'PEN')
      .trim()
      .toUpperCase();
    return m === 'USD' ? 'USD' : 'PEN';
  }

  static simboloMoneda(moneda) {
    return this.normalizarMoneda(moneda) === 'USD' ? '$' : 'S/';
  }

  static formatearMonto(monto, moneda) {
    const n = Number(monto);
    const sym = this.simboloMoneda(moneda);
    if (Number.isNaN(n)) return `${sym} —`;
    return `${sym} ${n.toFixed(2)}`;
  }

  static codigoTicket(row) {
    const raw = row.fecha_solicitud_usuario || row.created_at;
    let y = new Date().getFullYear();
    if (raw) {
      const s = String(raw);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) y = parseInt(s.slice(0, 4), 10);
      else {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) y = d.getFullYear();
      }
    }
    return `RDP-${y}-${String(row.id).padStart(5, '0')}`;
  }

  static normalizarFechaSolicitud(v) {
    if (v == null || v === '') return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    return null;
  }

  static async crear(datos) {
    const {
      empleado_id,
      fecha_solicitud_usuario,
      area,
      concepto,
      nombre_completo,
      dni,
      tiene_comprobante,
      archivo_comprobante_nombre,
      archivo_comprobante_path,
      archivo_recibo_generado_path,
      monto,
      moneda,
      ruc_proveedor,
      numero_documento
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO rendiciones_presupuesto
       (empleado_id, fecha_solicitud_usuario, area, concepto, nombre_completo, dni, tiene_comprobante,
        archivo_comprobante_nombre, archivo_comprobante_path, archivo_recibo_generado_path,
        monto, moneda, ruc_proveedor, numero_documento, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        empleado_id,
        fecha_solicitud_usuario,
        area,
        concepto,
        nombre_completo,
        dni,
        tiene_comprobante,
        archivo_comprobante_nombre || null,
        archivo_comprobante_path || null,
        archivo_recibo_generado_path || null,
        monto != null ? monto : 0,
        this.normalizarMoneda(moneda),
        ruc_proveedor || null,
        numero_documento || null
      ]
    );
    return result.insertId;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT rp.*, e.email as empleado_email, e.codigo_empleado
       FROM rendiciones_presupuesto rp
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE rp.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async listarPorEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT rp.* FROM rendiciones_presupuesto rp
       WHERE rp.empleado_id = ?
       ORDER BY rp.created_at DESC`,
      [empleadoId]
    );
    return rows;
  }

  static async listarPendientes() {
    const [rows] = await pool.execute(
      `SELECT rp.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos, e.email as empleado_email
       FROM rendiciones_presupuesto rp
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE rp.estado = 'pendiente'
       ORDER BY rp.created_at ASC`
    );
    return rows;
  }

  static async listarTodos(filtros = {}) {
    let q = `
      SELECT rp.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
      FROM rendiciones_presupuesto rp
      JOIN empleados e ON rp.empleado_id = e.id
      WHERE 1=1`;
    const params = [];
    if (filtros.estado) {
      q += ' AND rp.estado = ?';
      params.push(filtros.estado);
    }
    if (filtros.area) {
      q += ' AND rp.area = ?';
      params.push(filtros.area);
    }
    q += ' ORDER BY rp.created_at DESC';
    const [rows] = await pool.execute(q, params);
    return rows;
  }

  static async aprobar(id, aprobadorId, comentario = null) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'aprobado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado IN ('pendiente', 'observado')`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async rechazar(id, aprobadorId, comentario) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'rechazado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado IN ('pendiente', 'observado')`,
      [aprobadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async marcarObservado(id, revisadorId, comentario) {
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET estado = 'observado', aprobado_por = ?, fecha_resolucion = NOW(), comentarios_resolucion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [revisadorId, comentario, id]
    );
    return r.affectedRows > 0;
  }

  static async eliminarPorId(id) {
    const [r] = await pool.execute(`DELETE FROM rendiciones_presupuesto WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }

  static normalizarFechaDepositoApi(v) {
    return normalizarFechaDeposito(v);
  }

  static async listarAprobadasPorRangoFechaDocumento(fechaDesde, fechaHasta) {
    const [rows] = await pool.execute(
      `SELECT rp.*, e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
       FROM rendiciones_presupuesto rp
       JOIN empleados e ON rp.empleado_id = e.id
       WHERE rp.estado = 'aprobado'
         AND rp.fecha_solicitud_usuario >= ?
         AND rp.fecha_solicitud_usuario <= ?
       ORDER BY rp.fecha_solicitud_usuario ASC, rp.id ASC`,
      [fechaDesde, fechaHasta]
    );
    return rows;
  }

  /** Meses (año/mes del gasto) con rendiciones aprobadas sin período de caja creado. */
  static async listarMesesGastoAprobadosSinPeriodo() {
    const [rows] = await pool.execute(
      `SELECT
         YEAR(rp.fecha_solicitud_usuario) AS anio,
         MONTH(rp.fecha_solicitud_usuario) AS mes,
         COUNT(*) AS cantidad
       FROM rendiciones_presupuesto rp
       WHERE rp.estado = 'aprobado'
         AND rp.fecha_solicitud_usuario IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM rendicion_caja_periodos p
           WHERE p.anio = YEAR(rp.fecha_solicitud_usuario)
             AND p.mes = MONTH(rp.fecha_solicitud_usuario)
         )
       GROUP BY anio, mes
       ORDER BY anio DESC, mes DESC`
    );
    return rows.map((r) => ({
      anio: Number(r.anio),
      mes: Number(r.mes),
      cantidad: Number(r.cantidad) || 0
    }));
  }

  static async actualizarDatosDeposito(id, { fecha_deposito, monto_deposito }) {
    const fecha = normalizarFechaDeposito(fecha_deposito);
    if (fecha_deposito != null && fecha_deposito !== '' && fecha === null) {
      throw new Error('fecha_deposito no válida');
    }
    let monto = null;
    if (monto_deposito !== undefined && monto_deposito !== null && monto_deposito !== '') {
      monto = parseFloat(monto_deposito, 10);
      if (Number.isNaN(monto) || monto < 0) {
        throw new Error('monto_deposito no válido');
      }
    }
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET fecha_deposito = ?, monto_deposito = ?
       WHERE id = ? AND estado = 'aprobado'`,
      [fecha, monto, id]
    );
    return r.affectedRows > 0;
  }

  static async actualizarComprobanteDeposito(id, nombre, diskPath) {
    const row = await this.buscarPorId(id);
    if (!row || row.estado !== 'aprobado') return false;
    unlinkDepositoSeguro(row.comprobante_deposito_path);
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET comprobante_deposito_nombre = ?, comprobante_deposito_path = ?
       WHERE id = ? AND estado = 'aprobado'`,
      [nombre, diskPath, id]
    );
    return r.affectedRows > 0;
  }

  static async eliminarComprobanteDeposito(id) {
    const row = await this.buscarPorId(id);
    if (!row) return false;
    unlinkDepositoSeguro(row.comprobante_deposito_path);
    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto
       SET comprobante_deposito_nombre = NULL, comprobante_deposito_path = NULL
       WHERE id = ?`,
      [id]
    );
    return r.affectedRows > 0;
  }

  static async actualizarPorAdmin(id, datos) {
    const {
      fecha_solicitud_usuario,
      area,
      concepto,
      monto,
      moneda,
      tiene_comprobante,
      archivo_comprobante_nombre,
      archivo_comprobante_path
    } = datos;

    const [r] = await pool.execute(
      `UPDATE rendiciones_presupuesto SET
        fecha_solicitud_usuario = ?,
        area = ?,
        concepto = ?,
        monto = ?,
        moneda = ?,
        tiene_comprobante = ?,
        archivo_comprobante_nombre = ?,
        archivo_comprobante_path = ?
       WHERE id = ?`,
      [
        fecha_solicitud_usuario,
        area,
        concepto,
        monto,
        this.normalizarMoneda(moneda),
        tiene_comprobante ? 1 : 0,
        archivo_comprobante_nombre || null,
        archivo_comprobante_path || null,
        id
      ]
    );
    return r.affectedRows > 0;
  }
}

module.exports = RendicionPresupuesto;
