const { pool } = require('../config/database');

class SolicitudVacaciones {
  // Crear nueva solicitud
  static async crear(datos) {
    const {
      empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones,
      dias_solicitados, fecha_efectiva_salida, fecha_efectiva_regreso, observaciones
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO solicitudes_vacaciones 
       (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
        dias_solicitados, fecha_efectiva_salida, fecha_efectiva_regreso, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'borrador')`,
      [empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones,
       dias_solicitados, fecha_efectiva_salida || fecha_inicio_vacaciones,
       fecha_efectiva_regreso || fecha_fin_vacaciones, observaciones || null]
    );

    return result.insertId;
  }

  // Buscar por ID con información completa
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT sv.*, 
              e.codigo_empleado, e.nombres, e.apellidos, e.dni, e.cargo, e.email,
              pv.fecha_inicio_periodo, pv.fecha_fin_periodo, pv.dias_pendientes as dias_pendientes_periodo
       FROM solicitudes_vacaciones sv
       JOIN empleados e ON sv.empleado_id = e.id
       JOIN periodos_vacaciones pv ON sv.periodo_id = pv.id
       WHERE sv.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Listar solicitudes de un empleado
  static async listarPorEmpleado(empleadoId, filtros = {}) {
    let query = `
      SELECT sv.*, pv.fecha_inicio_periodo, pv.fecha_fin_periodo
      FROM solicitudes_vacaciones sv
      JOIN periodos_vacaciones pv ON sv.periodo_id = pv.id
      WHERE sv.empleado_id = ?
    `;
    const params = [empleadoId];

    if (filtros.estado) {
      query += ' AND sv.estado = ?';
      params.push(filtros.estado);
    }

    if (filtros.anio) {
      query += ' AND YEAR(sv.fecha_inicio_vacaciones) = ?';
      params.push(filtros.anio);
    }

    query += ' ORDER BY sv.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Listar solicitudes pendientes de aprobación para un aprobador
  static async listarPendientesAprobacion(aprobadorId, tipoAprobacion) {
    let estadoRequerido;
    if (tipoAprobacion === 'jefe') {
      estadoRequerido = 'pendiente_jefe';
    } else if (tipoAprobacion === 'contadora') {
      estadoRequerido = 'pendiente_contadora';
    }

    const [rows] = await pool.execute(
      `SELECT sv.*, 
              e.codigo_empleado, e.nombres, e.apellidos, e.cargo,
              pv.fecha_inicio_periodo, pv.fecha_fin_periodo
       FROM solicitudes_vacaciones sv
       JOIN empleados e ON sv.empleado_id = e.id
       JOIN periodos_vacaciones pv ON sv.periodo_id = pv.id
       WHERE sv.estado = ?
       ORDER BY sv.fecha_solicitud ASC`,
      [estadoRequerido]
    );
    return rows;
  }

  // Listar todas las solicitudes (para admin)
  static async listarTodas(filtros = {}) {
    let query = `
      SELECT sv.*, 
             e.codigo_empleado, e.nombres, e.apellidos, e.cargo,
             pv.fecha_inicio_periodo, pv.fecha_fin_periodo
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON sv.empleado_id = e.id
      JOIN periodos_vacaciones pv ON sv.periodo_id = pv.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.estado) {
      query += ' AND sv.estado = ?';
      params.push(filtros.estado);
    }

    if (filtros.empleado_id) {
      query += ' AND sv.empleado_id = ?';
      params.push(filtros.empleado_id);
    }

    if (filtros.fecha_desde) {
      query += ' AND sv.fecha_inicio_vacaciones >= ?';
      params.push(filtros.fecha_desde);
    }

    if (filtros.fecha_hasta) {
      query += ' AND sv.fecha_fin_vacaciones <= ?';
      params.push(filtros.fecha_hasta);
    }

    query += ' ORDER BY sv.created_at DESC';

    if (filtros.limite) {
      query += ' LIMIT ?';
      params.push(parseInt(filtros.limite));
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Actualizar estado de solicitud
  static async actualizarEstado(id, nuevoEstado) {
    const [result] = await pool.execute(
      'UPDATE solicitudes_vacaciones SET estado = ? WHERE id = ?',
      [nuevoEstado, id]
    );
    return result.affectedRows > 0;
  }

  // Actualizar solicitud
  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    Object.keys(datos).forEach(key => {
      if (datos[key] !== undefined && key !== 'id') {
        campos.push(`${key} = ?`);
        valores.push(datos[key]);
      }
    });

    valores.push(id);

    const [result] = await pool.execute(
      `UPDATE solicitudes_vacaciones SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }

  // Enviar solicitud (cambiar de borrador a pendiente)
  static async enviar(id) {
    return this.actualizarEstado(id, 'pendiente_jefe');
  }

  // Cancelar solicitud
  static async cancelar(id) {
    return this.actualizarEstado(id, 'cancelada');
  }

  // Obtener solicitudes para calendario
  static async obtenerParaCalendario(fechaInicio, fechaFin, empleadoId = null) {
    let query = `
      SELECT sv.id, sv.empleado_id, sv.fecha_inicio_vacaciones, sv.fecha_fin_vacaciones,
             sv.dias_solicitados, sv.estado,
             e.nombres, e.apellidos, e.cargo
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON sv.empleado_id = e.id
      WHERE sv.estado IN ('pendiente_jefe', 'pendiente_contadora', 'aprobada')
        AND sv.fecha_inicio_vacaciones <= ?
        AND sv.fecha_fin_vacaciones >= ?
    `;
    const params = [fechaFin, fechaInicio];

    if (empleadoId) {
      query += ' AND sv.empleado_id = ?';
      params.push(empleadoId);
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Verificar conflictos de fechas
  static async verificarConflictos(empleadoId, fechaInicio, fechaFin, excluirSolicitudId = null) {
    let query = `
      SELECT id, fecha_inicio_vacaciones, fecha_fin_vacaciones
      FROM solicitudes_vacaciones
      WHERE empleado_id = ?
        AND estado NOT IN ('rechazada', 'cancelada')
        AND ((fecha_inicio_vacaciones <= ? AND fecha_fin_vacaciones >= ?)
             OR (fecha_inicio_vacaciones <= ? AND fecha_fin_vacaciones >= ?)
             OR (fecha_inicio_vacaciones >= ? AND fecha_fin_vacaciones <= ?))
    `;
    const params = [empleadoId, fechaFin, fechaInicio, fechaInicio, fechaInicio, fechaInicio, fechaFin];

    if (excluirSolicitudId) {
      query += ' AND id != ?';
      params.push(excluirSolicitudId);
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Eliminar solicitud
  static async eliminar(id) {
    // Primero eliminar las aprobaciones relacionadas
    await pool.execute('DELETE FROM aprobaciones WHERE solicitud_id = ?', [id]);
    
    // Luego eliminar la solicitud
    const [result] = await pool.execute(
      'DELETE FROM solicitudes_vacaciones WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Estadísticas de solicitudes
  static async obtenerEstadisticas(anio = new Date().getFullYear()) {
    const [rows] = await pool.execute(
      `SELECT 
         estado,
         COUNT(*) as cantidad,
         SUM(dias_solicitados) as total_dias
       FROM solicitudes_vacaciones
       WHERE YEAR(fecha_inicio_vacaciones) = ?
       GROUP BY estado`,
      [anio]
    );
    return rows;
  }
}

module.exports = SolicitudVacaciones;


