const { Empleado, PeriodoVacaciones } = require('../models');

// Crear empleado
const crear = async (req, res) => {
  try {
    const {
      codigo_empleado, nombres, apellidos, dni, email, password,
      cargo, fecha_ingreso, rol_id, jefe_id
    } = req.body;

    // Validaciones básicas
    if (!codigo_empleado || !nombres || !apellidos || !dni || !email || !password || !fecha_ingreso || !rol_id) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan campos requeridos'
      });
    }

    // Verificar si ya existe
    const existeEmail = await Empleado.buscarPorEmail(email);
    if (existeEmail) {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya existe un empleado con ese email'
      });
    }

    const existeCodigo = await Empleado.buscarPorCodigo(codigo_empleado);
    if (existeCodigo) {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya existe un empleado con ese código'
      });
    }

    const id = await Empleado.crear({
      codigo_empleado, nombres, apellidos, dni, email, password,
      cargo, fecha_ingreso, rol_id, jefe_id
    });

    // Generar períodos de vacaciones automáticamente
    await PeriodoVacaciones.generarPeriodos(id, fecha_ingreso);

    const empleado = await Empleado.buscarPorId(id);
    const { password: _, ...empleadoSinPassword } = empleado;

    res.status(201).json({
      success: true,
      mensaje: 'Empleado creado correctamente',
      data: empleadoSinPassword
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar todos los empleados
const listar = async (req, res) => {
  try {
    const { activo, rol_id, busqueda } = req.query;
    
    const filtros = {};
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (rol_id) filtros.rol_id = parseInt(rol_id);
    if (busqueda) filtros.busqueda = busqueda;

    const empleados = await Empleado.listarTodos(filtros);

    res.json({
      success: true,
      data: empleados
    });
  } catch (error) {
    console.error('Error al listar empleados:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener empleado por ID
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const empleado = await Empleado.buscarPorId(parseInt(id));

    if (!empleado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    const { password: _, ...empleadoSinPassword } = empleado;

    res.json({
      success: true,
      data: empleadoSinPassword
    });
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Actualizar empleado
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const empleado = await Empleado.buscarPorId(parseInt(id));
    if (!empleado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    // Si cambia el email, verificar que no exista
    if (datos.email && datos.email !== empleado.email) {
      const existeEmail = await Empleado.buscarPorEmail(datos.email);
      if (existeEmail) {
        return res.status(400).json({
          success: false,
          mensaje: 'Ya existe un empleado con ese email'
        });
      }
    }

    await Empleado.actualizar(parseInt(id), datos);
    const empleadoActualizado = await Empleado.buscarPorId(parseInt(id));
    const { password: _, ...empleadoSinPassword } = empleadoActualizado;

    res.json({
      success: true,
      mensaje: 'Empleado actualizado correctamente',
      data: empleadoSinPassword
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Desactivar empleado
const desactivar = async (req, res) => {
  try {
    const { id } = req.params;

    const empleado = await Empleado.buscarPorId(parseInt(id));
    if (!empleado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    await Empleado.desactivar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Empleado desactivado correctamente'
    });
  } catch (error) {
    console.error('Error al desactivar empleado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Reactivar empleado
const reactivar = async (req, res) => {
  try {
    const { id } = req.params;

    const empleado = await Empleado.buscarPorId(parseInt(id));
    if (!empleado) {
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    await Empleado.reactivar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Empleado reactivado correctamente'
    });
  } catch (error) {
    console.error('Error al reactivar empleado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener subordinados
const obtenerSubordinados = async (req, res) => {
  try {
    const { id } = req.params;
    const subordinados = await Empleado.obtenerSubordinados(parseInt(id));

    res.json({
      success: true,
      data: subordinados
    });
  } catch (error) {
    console.error('Error al obtener subordinados:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  crear,
  listar,
  obtener,
  actualizar,
  desactivar,
  reactivar,
  obtenerSubordinados
};


