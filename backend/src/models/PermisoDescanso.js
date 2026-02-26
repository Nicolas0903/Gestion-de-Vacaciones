const { pool } = require('../config/database');

class PermisoDescanso {
  // Crear nuevo permiso/descanso
  static async crear(datos) {
    const { 
      empleado_id, tipo, fecha_inicio, fecha_fin, dias_totales,
      motivo, observaciones, archivo_nombre, archivo_path 
    } = datos;
    
    const [result] = await pool.execute(
      `INSERT INTO permisos_descansos 
       (empleado_id, tipo, fecha_inicio, fecha_fin, dias_totales, motivo, 
        observaciones, archivo_nombre, archivo_path, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [empleado_id, tipo, fecha_inicio, fecha_fin, dias_totales, motivo,
       observaciones || null, archivo_nombre || null, archivo_path || null]
    );
    
    return result.insertId;
  }

  // Buscar por ID
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, 
              e.nombres as empleado_nombres, 
              e.apellidos as empleado_apellidos,
              e.codigo_empleado,
              e.cargo as empleado_cargo,
              a.nombres as aprobador_nombres,
              a.apellidos as aprobador_apellidos
       FROM permisos_descansos p
       JOIN empleados e ON p.empleado_id = e.id
       LEFT JOIN empleados a ON p.aprobado_por = a.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Listar permisos de un empleado
  static async listarPorEmpleado(empleadoId, filtros = {}) {
    let query = `
      SELECT p.*, 
             e.nombres as empleado_nombres, 
             e.apellidos as empleado_apellidos
      FROM permisos_descansos p
      JOIN empleados e ON p.empleado_id = e.id
      WHERE p.empleado_id = ?
    `;
    const params = [empleadoId];
    
    if (filtros.tipo) {
      query += ' AND p.tipo = ?';
      params.push(filtros.tipo);
    }
    
    if (filtros.estado) {
      query += ' AND p.estado = ?';
      params.push(filtros.estado);
    }
    
    if (filtros.anio) {
      query += ' AND YEAR(p.fecha_inicio) = ?';
      params.push(filtros.anio);
    }
    
    query += ' ORDER BY p.fecha_inicio DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Listar todos los permisos (para admin)
  static async listarTodos(filtros = {}) {
    let query = `
      SELECT p.*, 
             e.nombres as empleado_nombres, 
             e.apellidos as empleado_apellidos,
             e.codigo_empleado,
             e.cargo as empleado_cargo,
             a.nombres as aprobador_nombres,
             a.apellidos as aprobador_apellidos
      FROM permisos_descansos p
      JOIN empleados e ON p.empleado_id = e.id
      LEFT JOIN empleados a ON p.aprobado_por = a.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filtros.empleado_id) {
      query += ' AND p.empleado_id = ?';
      params.push(filtros.empleado_id);
    }
    
    if (filtros.tipo) {
      query += ' AND p.tipo = ?';
      params.push(filtros.tipo);
    }
    
    if (filtros.estado) {
      query += ' AND p.estado = ?';
      params.push(filtros.estado);
    }
    
    if (filtros.fecha_inicio && filtros.fecha_fin) {
      query += ' AND ((p.fecha_inicio BETWEEN ? AND ?) OR (p.fecha_fin BETWEEN ? AND ?))';
      params.push(filtros.fecha_inicio, filtros.fecha_fin, filtros.fecha_inicio, filtros.fecha_fin);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Listar permisos pendientes de aprobación
  static async listarPendientes() {
    const [rows] = await pool.execute(
      `SELECT p.*, 
              e.nombres as empleado_nombres, 
              e.apellidos as empleado_apellidos,
              e.codigo_empleado,
              e.cargo as empleado_cargo
       FROM permisos_descansos p
       JOIN empleados e ON p.empleado_id = e.id
       WHERE p.estado = 'pendiente'
       ORDER BY p.created_at ASC`
    );
    return rows;
  }

  // Aprobar permiso/descanso
  static async aprobar(id, aprobadorId, comentarios = null) {
    const [result] = await pool.execute(
      `UPDATE permisos_descansos 
       SET estado = 'aprobado', 
           aprobado_por = ?, 
           fecha_aprobacion = CURRENT_TIMESTAMP,
           comentarios_aprobacion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [aprobadorId, comentarios, id]
    );
    return result.affectedRows > 0;
  }

  // Rechazar permiso/descanso
  static async rechazar(id, aprobadorId, comentarios) {
    const [result] = await pool.execute(
      `UPDATE permisos_descansos 
       SET estado = 'rechazado', 
           aprobado_por = ?, 
           fecha_aprobacion = CURRENT_TIMESTAMP,
           comentarios_aprobacion = ?
       WHERE id = ? AND estado = 'pendiente'`,
      [aprobadorId, comentarios, id]
    );
    return result.affectedRows > 0;
  }

  // Eliminar permiso/descanso
  static async eliminar(id) {
    const [result] = await pool.execute(
      'DELETE FROM permisos_descansos WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Obtener permisos para el calendario (rango de fechas)
  static async obtenerParaCalendario(fechaInicio, fechaFin, empleadoId = null) {
    let query = `
      SELECT p.id, p.empleado_id, p.tipo, p.fecha_inicio, p.fecha_fin, 
             p.dias_totales, p.motivo, p.estado,
             e.nombres as empleado_nombres, 
             e.apellidos as empleado_apellidos
      FROM permisos_descansos p
      JOIN empleados e ON p.empleado_id = e.id
      WHERE p.estado = 'aprobado'
        AND ((p.fecha_inicio BETWEEN ? AND ?) OR (p.fecha_fin BETWEEN ? AND ?)
             OR (p.fecha_inicio <= ? AND p.fecha_fin >= ?))
    `;
    const params = [fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin];
    
    if (empleadoId) {
      query += ' AND p.empleado_id = ?';
      params.push(empleadoId);
    }
    
    query += ' ORDER BY p.fecha_inicio';
    
    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Obtener resumen de permisos por empleado
  static async obtenerResumen(empleadoId, anio = null) {
    const year = anio || new Date().getFullYear();
    
    const [rows] = await pool.execute(
      `SELECT 
         tipo,
         COUNT(*) as cantidad,
         SUM(dias_totales) as dias_totales,
         SUM(CASE WHEN estado = 'aprobado' THEN dias_totales ELSE 0 END) as dias_aprobados,
         SUM(CASE WHEN estado = 'pendiente' THEN dias_totales ELSE 0 END) as dias_pendientes
       FROM permisos_descansos
       WHERE empleado_id = ? AND YEAR(fecha_inicio) = ?
       GROUP BY tipo`,
      [empleadoId, year]
    );
    return rows;
  }

  // Actualizar permiso/descanso
  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    const camposPermitidos = ['tipo', 'fecha_inicio', 'fecha_fin', 'dias_totales', 
                              'motivo', 'observaciones', 'archivo_nombre', 'archivo_path'];

    camposPermitidos.forEach(campo => {
      if (datos[campo] !== undefined) {
        campos.push(`${campo} = ?`);
        valores.push(datos[campo]);
      }
    });

    if (campos.length === 0) return false;

    valores.push(id);

    const [result] = await pool.execute(
      `UPDATE permisos_descansos SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }
}

module.exports = PermisoDescanso;
