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

  /**
   * Renueva cuando en MySQL fecha_fin_periodo < CURDATE() (misma regla que el día
   * siguiente al cierre tiene derecho nuevo; el último día del período aún cuenta).
   * Usar CURDATE() evita cortar la renovación por desajuste TZ entre Node y la BD.
   */
  static async renovarSiVencido(empleadoId) {
    try {
      for (let iter = 0; iter < 20; iter++) {
        const [rows] = await pool.execute(
          `SELECT
             id,
             empleado_id,
             fecha_fin_periodo,
             dias_correspondientes,
             (fecha_fin_periodo < CURDATE()) AS debe_renovar,
             DATE_FORMAT(DATE_ADD(fecha_fin_periodo, INTERVAL 1 DAY), '%Y-%m-%d')
               AS fecha_inicio_nuevo,
             DATE_FORMAT(
               DATE_SUB(
                 DATE_ADD(DATE_ADD(fecha_fin_periodo, INTERVAL 1 DAY), INTERVAL 1 YEAR),
                 INTERVAL 1 DAY
               ),
               '%Y-%m-%d'
             ) AS fecha_fin_nuevo
           FROM periodos_vacaciones
           WHERE empleado_id = ?
           ORDER BY fecha_fin_periodo DESC
           LIMIT 1`,
          [empleadoId]
        );
        if (rows.length === 0) break;

        const ultimo = rows[0];
        const debeRenovar = ultimo.debe_renovar == 1;
        if (!debeRenovar) break;

        const fechaInicioNuevo = ultimo.fecha_inicio_nuevo;
        const fechaFinNuevo = ultimo.fecha_fin_nuevo;
        if (!fechaInicioNuevo || !fechaFinNuevo) break;

        const [existe] = await pool.execute(
          `SELECT id FROM periodos_vacaciones
           WHERE empleado_id = ? AND fecha_inicio_periodo = ?`,
          [empleadoId, fechaInicioNuevo]
        );
        if (existe.length > 0) break;

        const diasCorrespondientes = Number(ultimo.dias_correspondientes) || 30;
        const yIni = String(fechaInicioNuevo).slice(0, 4);
        const yFin = String(fechaFinNuevo).slice(0, 4);
        await this.crear({
          empleado_id: empleadoId,
          fecha_inicio_periodo: fechaInicioNuevo,
          fecha_fin_periodo: fechaFinNuevo,
          dias_correspondientes: diasCorrespondientes,
          tiempo_trabajado: '12 meses',
          observaciones: `Período ${yIni}-${yFin} (renovación automática)`
        });
      }
    } catch (err) {
      console.error('Error renovarSiVencido:', err);
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
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido obtenerPendientes:', e);
    }

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
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido obtenerResumen:', e);
    }

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


