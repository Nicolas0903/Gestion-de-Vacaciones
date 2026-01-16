const { PeriodoVacaciones } = require('../models');

// Crear período
const crear = async (req, res) => {
  try {
    const { empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, tiempo_trabajado, observaciones } = req.body;

    if (!empleado_id || !fecha_inicio_periodo || !fecha_fin_periodo) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan campos requeridos'
      });
    }

    const id = await PeriodoVacaciones.crear({
      empleado_id,
      fecha_inicio_periodo,
      fecha_fin_periodo,
      dias_correspondientes,
      tiempo_trabajado,
      observaciones
    });

    const periodo = await PeriodoVacaciones.buscarPorId(id);

    res.status(201).json({
      success: true,
      mensaje: 'Período creado correctamente',
      data: periodo
    });
  } catch (error) {
    console.error('Error al crear período:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar períodos de un empleado
const listarPorEmpleado = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const periodos = await PeriodoVacaciones.listarPorEmpleado(parseInt(empleadoId));

    res.json({
      success: true,
      data: periodos
    });
  } catch (error) {
    console.error('Error al listar períodos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar mis períodos
const listarMios = async (req, res) => {
  try {
    const periodos = await PeriodoVacaciones.listarPorEmpleado(req.usuario.id);

    res.json({
      success: true,
      data: periodos
    });
  } catch (error) {
    console.error('Error al listar mis períodos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener períodos pendientes (con días disponibles)
const obtenerPendientes = async (req, res) => {
  try {
    const empleadoId = req.params.empleadoId ? parseInt(req.params.empleadoId) : req.usuario.id;
    const periodos = await PeriodoVacaciones.obtenerPendientes(empleadoId);

    res.json({
      success: true,
      data: periodos
    });
  } catch (error) {
    console.error('Error al obtener períodos pendientes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener resumen de vacaciones
const obtenerResumen = async (req, res) => {
  try {
    const empleadoId = req.params.empleadoId ? parseInt(req.params.empleadoId) : req.usuario.id;
    const resumen = await PeriodoVacaciones.obtenerResumen(empleadoId);

    res.json({
      success: true,
      data: {
        total_ganados: resumen.total_ganados || 0,
        total_gozados: resumen.total_gozados || 0,
        total_pendientes: resumen.total_pendientes || 0
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Actualizar período
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const periodo = await PeriodoVacaciones.buscarPorId(parseInt(id));
    if (!periodo) {
      return res.status(404).json({
        success: false,
        mensaje: 'Período no encontrado'
      });
    }

    await PeriodoVacaciones.actualizar(parseInt(id), datos);
    const periodoActualizado = await PeriodoVacaciones.buscarPorId(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Período actualizado correctamente',
      data: periodoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar período:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Generar períodos automáticamente
const generarPeriodos = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { fecha_ingreso, anio_hasta } = req.body;

    if (!fecha_ingreso) {
      return res.status(400).json({
        success: false,
        mensaje: 'Fecha de ingreso es requerida'
      });
    }

    const periodosCreados = await PeriodoVacaciones.generarPeriodos(
      parseInt(empleadoId),
      fecha_ingreso,
      anio_hasta || new Date().getFullYear()
    );

    res.json({
      success: true,
      mensaje: `Se crearon ${periodosCreados.length} períodos`,
      data: { periodos_creados: periodosCreados.length }
    });
  } catch (error) {
    console.error('Error al generar períodos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Eliminar período
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const periodo = await PeriodoVacaciones.buscarPorId(parseInt(id));
    if (!periodo) {
      return res.status(404).json({
        success: false,
        mensaje: 'Período no encontrado'
      });
    }

    if (periodo.dias_gozados > 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se puede eliminar un período con días gozados'
      });
    }

    await PeriodoVacaciones.eliminar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Período eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar período:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  crear,
  listarPorEmpleado,
  listarMios,
  obtenerPendientes,
  obtenerResumen,
  actualizar,
  generarPeriodos,
  eliminar
};


