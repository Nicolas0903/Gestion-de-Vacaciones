const { pool } = require('../config/database');

class PeriodoVacaciones {
  // Crear nuevo período
  static async crear(datos) {
    const {
      empleado_id, fecha_inicio_periodo, fecha_fin_periodo,
      dias_correspondientes = 30, tiempo_trabajado, observaciones
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO periodos_vacaciones 
       (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, tiempo_trabajado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, tiempo_trabajado || '12 meses', observaciones || null]
    );

    return result.insertId;
  }

  // Buscar por ID
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT pv.*, e.nombres, e.apellidos, e.codigo_empleado
       FROM periodos_vacaciones pv
       JOIN empleados e ON pv.empleado_id = e.id
       WHERE pv.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Listar períodos de un empleado
  static async listarPorEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ?
       ORDER BY fecha_inicio_periodo DESC`,
      [empleadoId]
    );
    return rows;
  }

  // Obtener períodos con días pendientes
  static async obtenerPendientes(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ? AND dias_pendientes > 0
       ORDER BY fecha_inicio_periodo ASC`,
      [empleadoId]
    );
    return rows;
  }

  // Obtener resumen de vacaciones de un empleado
  static async obtenerResumen(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT 
         SUM(dias_correspondientes) as total_ganados,
         SUM(dias_gozados) as total_gozados,
         SUM(dias_pendientes) as total_pendientes
       FROM periodos_vacaciones
       WHERE empleado_id = ?`,
      [empleadoId]
    );
    return rows[0];
  }

  // Actualizar días gozados
  static async actualizarDiasGozados(id, diasGozados) {
    const periodo = await this.buscarPorId(id);
    if (!periodo) return false;

    const nuevosDiasGozados = periodo.dias_gozados + diasGozados;
    let estado = 'pendiente';
    
    if (nuevosDiasGozados >= periodo.dias_correspondientes) {
      estado = 'gozadas';
    } else if (nuevosDiasGozados > 0) {
      estado = 'parcial';
    }

    const [result] = await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = ?, estado = ?
       WHERE id = ?`,
      [nuevosDiasGozados, estado, id]
    );

    return result.affectedRows > 0;
  }

  // Revertir días gozados (cuando se elimina una solicitud aprobada)
  static async revertirDiasGozados(id, diasARevertir) {
    const periodo = await this.buscarPorId(id);
    if (!periodo) return false;

    const nuevosDiasGozados = Math.max(0, periodo.dias_gozados - diasARevertir);
    let estado = 'pendiente';
    
    if (nuevosDiasGozados >= periodo.dias_correspondientes) {
      estado = 'gozadas';
    } else if (nuevosDiasGozados > 0) {
      estado = 'parcial';
    }

    const [result] = await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = ?, estado = ?
       WHERE id = ?`,
      [nuevosDiasGozados, estado, id]
    );

    return result.affectedRows > 0;
  }

  // Actualizar período
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
      `UPDATE periodos_vacaciones SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }

  // Generar períodos automáticamente para un empleado
  static async generarPeriodos(empleadoId, fechaIngreso, anioHasta = new Date().getFullYear()) {
    const fechaInicio = new Date(fechaIngreso);
    const anioIngreso = fechaInicio.getFullYear();
    const periodos = [];

    for (let anio = anioIngreso; anio <= anioHasta; anio++) {
      const fechaInicioPeriodo = new Date(anio, fechaInicio.getMonth(), fechaInicio.getDate());
      const fechaFinPeriodo = new Date(anio + 1, fechaInicio.getMonth(), fechaInicio.getDate() - 1);

      // Verificar si ya existe el período
      const [existente] = await pool.execute(
        `SELECT id FROM periodos_vacaciones 
         WHERE empleado_id = ? AND YEAR(fecha_inicio_periodo) = ?`,
        [empleadoId, anio]
      );

      if (existente.length === 0) {
        const id = await this.crear({
          empleado_id: empleadoId,
          fecha_inicio_periodo: fechaInicioPeriodo.toISOString().split('T')[0],
          fecha_fin_periodo: fechaFinPeriodo.toISOString().split('T')[0],
          tiempo_trabajado: '12 meses',
          observaciones: `Período ${anio}-${anio + 1}`
        });
        periodos.push(id);
      }
    }

    return periodos;
  }

  // Eliminar período
  static async eliminar(id) {
    const [result] = await pool.execute(
      'DELETE FROM periodos_vacaciones WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = PeriodoVacaciones;


