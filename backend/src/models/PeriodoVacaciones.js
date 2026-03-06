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

  // Buscar por ID (con estado calculado)
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT pv.*, e.nombres, e.apellidos, e.codigo_empleado
       FROM periodos_vacaciones pv
       JOIN empleados e ON pv.empleado_id = e.id
       WHERE pv.id = ?`,
      [id]
    );
    const p = rows[0];
    if (!p) return null;
    return {
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    };
  }

  // Calcular estado correcto según días gozados/correspondientes
  static _calcularEstado(diasGozados, diasCorrespondientes) {
    if (diasGozados >= diasCorrespondientes) return 'gozadas';
    if (diasGozados > 0) return 'parcial';
    return 'pendiente';
  }

  // Convierte fecha (string YYYY-MM-DD o Date) a objeto Date local
  static _parsearFechaLocal(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const str = String(val).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    return null;
  }

  // Renovar período automáticamente si fecha_fin_periodo ya pasó
  static async renovarSiVencido(empleadoId) {
    try {
      const [periodos] = await pool.execute(
        `SELECT * FROM periodos_vacaciones WHERE empleado_id = ?
         ORDER BY fecha_fin_periodo DESC LIMIT 1`,
        [empleadoId]
      );
      if (periodos.length === 0) return null;

      const ultimo = periodos[0];
      const fechaFin = this._parsearFechaLocal(ultimo.fecha_fin_periodo);
      if (!fechaFin || isNaN(fechaFin.getTime())) return null;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const finNormalizado = new Date(fechaFin);
      finNormalizado.setHours(0, 0, 0, 0);
      if (finNormalizado >= hoy) return null; // Aún no vence

      const diaSiguiente = new Date(finNormalizado);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const fechaInicioNuevo = `${diaSiguiente.getFullYear()}-${String(diaSiguiente.getMonth() + 1).padStart(2, '0')}-${String(diaSiguiente.getDate()).padStart(2, '0')}`;

      const finNuevo = new Date(diaSiguiente.getFullYear() + 1, diaSiguiente.getMonth(), diaSiguiente.getDate() - 1);
      const fechaFinNuevo = `${finNuevo.getFullYear()}-${String(finNuevo.getMonth() + 1).padStart(2, '0')}-${String(finNuevo.getDate()).padStart(2, '0')}`;

      const [existe] = await pool.execute(
        `SELECT id FROM periodos_vacaciones
         WHERE empleado_id = ? AND fecha_inicio_periodo = ?`,
        [empleadoId, fechaInicioNuevo]
      );
      if (existe.length > 0) return null;

      const diasCorrespondientes = ultimo.dias_correspondientes || 30;
      const id = await this.crear({
        empleado_id: empleadoId,
        fecha_inicio_periodo: fechaInicioNuevo,
        fecha_fin_periodo: fechaFinNuevo,
        dias_correspondientes,
        tiempo_trabajado: '12 meses',
        observaciones: `Período ${diaSiguiente.getFullYear()}-${diaSiguiente.getFullYear() + 1} (renovación automática)`
      });
      return id;
    } catch (err) {
      console.error('Error renovarSiVencido:', err);
      return null;
    }
  }

  // Listar períodos de un empleado (con renovación automática y estado calculado)
  static async listarPorEmpleado(empleadoId) {
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido:', e);
    }

    const [rows] = await pool.execute(
      `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ?
       ORDER BY fecha_inicio_periodo DESC`,
      [empleadoId]
    );

    return rows.map(p => ({
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    }));
  }

  // Obtener períodos con días pendientes
  static async obtenerPendientes(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ? AND dias_pendientes > 0
       ORDER BY fecha_inicio_periodo ASC`,
      [empleadoId]
    );
    return rows.map(p => ({
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    }));
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


