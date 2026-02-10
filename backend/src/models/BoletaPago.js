const pool = require('../config/database');

class BoletaPago {
  // Crear nueva boleta
  static async crear(datos) {
    const { empleado_id, mes, anio, archivo_nombre, archivo_path, subido_por, observaciones } = datos;
    
    const [result] = await pool.execute(
      `INSERT INTO boletas_pago 
       (empleado_id, mes, anio, archivo_nombre, archivo_path, subido_por, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         archivo_nombre = VALUES(archivo_nombre),
         archivo_path = VALUES(archivo_path),
         subido_por = VALUES(subido_por),
         observaciones = VALUES(observaciones),
         firmada = FALSE,
         fecha_firma = NULL`,
      [empleado_id, mes, anio, archivo_nombre, archivo_path, subido_por, observaciones || null]
    );
    
    return result.insertId || result.affectedRows;
  }

  // Buscar boleta por ID
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT b.*, 
              e.nombres as empleado_nombres, 
              e.apellidos as empleado_apellidos,
              e.codigo_empleado,
              s.nombres as subido_por_nombres,
              s.apellidos as subido_por_apellidos
       FROM boletas_pago b
       JOIN empleados e ON b.empleado_id = e.id
       JOIN empleados s ON b.subido_por = s.id
       WHERE b.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Listar boletas de un empleado
  static async listarPorEmpleado(empleadoId, anio = null) {
    let query = `
      SELECT b.*, 
             e.nombres as empleado_nombres, 
             e.apellidos as empleado_apellidos
      FROM boletas_pago b
      JOIN empleados e ON b.empleado_id = e.id
      WHERE b.empleado_id = ?
    `;
    const params = [empleadoId];
    
    if (anio) {
      query += ' AND b.anio = ?';
      params.push(anio);
    }
    
    query += ' ORDER BY b.anio DESC, b.mes DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Listar todas las boletas (para admin)
  static async listarTodas(filtros = {}) {
    let query = `
      SELECT b.*, 
             e.nombres as empleado_nombres, 
             e.apellidos as empleado_apellidos,
             e.codigo_empleado,
             s.nombres as subido_por_nombres,
             s.apellidos as subido_por_apellidos
      FROM boletas_pago b
      JOIN empleados e ON b.empleado_id = e.id
      JOIN empleados s ON b.subido_por = s.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filtros.empleado_id) {
      query += ' AND b.empleado_id = ?';
      params.push(filtros.empleado_id);
    }
    
    if (filtros.mes) {
      query += ' AND b.mes = ?';
      params.push(filtros.mes);
    }
    
    if (filtros.anio) {
      query += ' AND b.anio = ?';
      params.push(filtros.anio);
    }
    
    if (filtros.firmada !== undefined) {
      query += ' AND b.firmada = ?';
      params.push(filtros.firmada);
    }
    
    query += ' ORDER BY b.anio DESC, b.mes DESC, e.apellidos ASC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Firmar boleta (empleado confirma recepción)
  static async firmar(id, empleadoId) {
    const [result] = await pool.execute(
      `UPDATE boletas_pago 
       SET firmada = TRUE, fecha_firma = CURRENT_TIMESTAMP
       WHERE id = ? AND empleado_id = ? AND firmada = FALSE`,
      [id, empleadoId]
    );
    return result.affectedRows > 0;
  }

  // Eliminar boleta
  static async eliminar(id) {
    const [result] = await pool.execute(
      'DELETE FROM boletas_pago WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Obtener resumen de boletas por mes/año
  static async obtenerResumen(anio, mes) {
    const [rows] = await pool.execute(
      `SELECT 
         COUNT(*) as total_boletas,
         SUM(CASE WHEN firmada = TRUE THEN 1 ELSE 0 END) as firmadas,
         SUM(CASE WHEN firmada = FALSE THEN 1 ELSE 0 END) as pendientes
       FROM boletas_pago
       WHERE anio = ? AND mes = ?`,
      [anio, mes]
    );
    return rows[0];
  }

  // Obtener años disponibles para un empleado
  static async obtenerAniosDisponibles(empleadoId = null) {
    let query = 'SELECT DISTINCT anio FROM boletas_pago';
    const params = [];
    
    if (empleadoId) {
      query += ' WHERE empleado_id = ?';
      params.push(empleadoId);
    }
    
    query += ' ORDER BY anio DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows.map(r => r.anio);
  }

  // Verificar si existe boleta para empleado/mes/año
  static async existe(empleadoId, mes, anio) {
    const [rows] = await pool.execute(
      'SELECT id FROM boletas_pago WHERE empleado_id = ? AND mes = ? AND anio = ?',
      [empleadoId, mes, anio]
    );
    return rows.length > 0;
  }
}

module.exports = BoletaPago;
