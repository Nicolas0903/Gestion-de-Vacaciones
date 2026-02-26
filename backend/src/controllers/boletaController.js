const BoletaPago = require('../models/BoletaPago');
const Empleado = require('../models/Empleado');
const path = require('path');
const fs = require('fs').promises;

// Obtener mis boletas (empleado)
const misBoletas = async (req, res) => {
  try {
    const { anio } = req.query;
    const boletas = await BoletaPago.listarPorEmpleado(req.usuario.id, anio || null);
    
    res.json({
      success: true,
      data: boletas
    });
  } catch (error) {
    console.error('Error al obtener boletas:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener años disponibles para el empleado
const misAniosDisponibles = async (req, res) => {
  try {
    const anios = await BoletaPago.obtenerAniosDisponibles(req.usuario.id);
    
    res.json({
      success: true,
      data: anios
    });
  } catch (error) {
    console.error('Error al obtener años:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Firmar boleta (confirmar recepción)
const firmarBoleta = async (req, res) => {
  try {
    const { id } = req.params;
    
    const boleta = await BoletaPago.buscarPorId(parseInt(id));
    if (!boleta) {
      return res.status(404).json({
        success: false,
        mensaje: 'Boleta no encontrada'
      });
    }

    // Verificar que la boleta pertenece al empleado
    if (boleta.empleado_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para firmar esta boleta'
      });
    }

    if (boleta.firmada) {
      return res.status(400).json({
        success: false,
        mensaje: 'Esta boleta ya fue firmada'
      });
    }

    await BoletaPago.firmar(parseInt(id), req.usuario.id);
    
    res.json({
      success: true,
      mensaje: 'Boleta firmada correctamente'
    });
  } catch (error) {
    console.error('Error al firmar boleta:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Descargar boleta
const descargarBoleta = async (req, res) => {
  try {
    const { id } = req.params;
    
    const boleta = await BoletaPago.buscarPorId(parseInt(id));
    if (!boleta) {
      return res.status(404).json({
        success: false,
        mensaje: 'Boleta no encontrada'
      });
    }

    // Verificar permisos (empleado dueño o admin/contadora)
    const esAdmin = req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora';
    if (boleta.empleado_id !== req.usuario.id && !esAdmin) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para descargar esta boleta'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/boletas', boleta.archivo_path);
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    res.download(filePath, boleta.archivo_nombre);
  } catch (error) {
    console.error('Error al descargar boleta:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// ============================================
// FUNCIONES ADMIN (Rocío)
// ============================================

// Listar todas las boletas (admin)
const listarBoletas = async (req, res) => {
  try {
    const { empleado_id, mes, anio, firmada } = req.query;
    
    const filtros = {};
    if (empleado_id) filtros.empleado_id = parseInt(empleado_id);
    if (mes) filtros.mes = parseInt(mes);
    if (anio) filtros.anio = parseInt(anio);
    if (firmada !== undefined) filtros.firmada = firmada === 'true';
    
    const boletas = await BoletaPago.listarTodas(filtros);
    
    res.json({
      success: true,
      data: boletas
    });
  } catch (error) {
    console.error('Error al listar boletas:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Subir boleta
const subirBoleta = async (req, res) => {
  try {
    const { empleado_id, mes, anio, observaciones } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'Debe subir un archivo PDF'
      });
    }

    if (!empleado_id || !mes || !anio) {
      // Eliminar archivo subido si faltan datos
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        mensaje: 'Empleado, mes y año son requeridos'
      });
    }

    // Verificar que el empleado existe
    const empleado = await Empleado.buscarPorId(parseInt(empleado_id));
    if (!empleado) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    // Crear registro en BD
    const boletaId = await BoletaPago.crear({
      empleado_id: parseInt(empleado_id),
      mes: parseInt(mes),
      anio: parseInt(anio),
      archivo_nombre: req.file.originalname,
      archivo_path: req.file.filename,
      subido_por: req.usuario.id,
      observaciones
    });

    res.json({
      success: true,
      mensaje: 'Boleta subida correctamente',
      data: { id: boletaId }
    });
  } catch (error) {
    console.error('Error al subir boleta:', error);
    // Limpiar archivo si hubo error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Subir boletas masivamente (múltiples empleados)
// Formato de archivo esperado: RUC_YYYYMM_MM_DNI_codigo.pdf
// Ejemplo: 20524271002_202601_01_09374480_r08.pdf
const subirBoletasMasivo = async (req, res) => {
  try {
    let { mes, anio } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Debe subir al menos un archivo'
      });
    }

    const resultados = [];
    const errores = [];

    for (const file of files) {
      const nombreSinExt = path.parse(file.originalname).name;
      const partes = nombreSinExt.split('_');
      
      let empleado = null;
      let mesArchivo = mes ? parseInt(mes) : null;
      let anioArchivo = anio ? parseInt(anio) : null;
      
      // Detectar formato: RUC_YYYYMM_MM_DNI_codigo.pdf
      // Ejemplo: 20524271002_202601_01_09374480_r08.pdf
      if (partes.length >= 4 && partes[0].length === 11 && partes[1].length === 6) {
        // Formato de boletas de planilla
        const periodo = partes[1]; // YYYYMM
        const dni = partes[3];
        
        // Extraer año y mes del período si no se proporcionaron
        if (!anioArchivo) {
          anioArchivo = parseInt(periodo.substring(0, 4));
        }
        if (!mesArchivo) {
          mesArchivo = parseInt(periodo.substring(4, 6));
        }
        
        // Buscar empleado por DNI
        empleado = await Empleado.buscarPorDni(dni);
        
        if (!empleado) {
          errores.push({
            archivo: file.originalname,
            error: `Empleado no encontrado con DNI: ${dni}`
          });
          await fs.unlink(file.path).catch(() => {});
          continue;
        }
      } else {
        // Formato anterior: CODIGO_MES_AÑO.pdf o simplemente CODIGO.pdf
        const identificador = partes[0];
        
        // Buscar empleado por código, email o DNI
        empleado = await Empleado.buscarPorCodigo(identificador);
        
        if (!empleado) {
          empleado = await Empleado.buscarPorEmail(identificador);
        }
        
        if (!empleado) {
          empleado = await Empleado.buscarPorDni(identificador);
        }
        
        if (!empleado) {
          errores.push({
            archivo: file.originalname,
            error: `Empleado no encontrado: ${identificador}`
          });
          await fs.unlink(file.path).catch(() => {});
          continue;
        }
      }

      // Validar que tenemos mes y año
      if (!mesArchivo || !anioArchivo) {
        errores.push({
          archivo: file.originalname,
          error: 'No se pudo determinar el mes y año. Proporcione estos valores o use el formato de nombre correcto.'
        });
        await fs.unlink(file.path).catch(() => {});
        continue;
      }

      try {
        await BoletaPago.crear({
          empleado_id: empleado.id,
          mes: mesArchivo,
          anio: anioArchivo,
          archivo_nombre: file.originalname,
          archivo_path: file.filename,
          subido_por: req.usuario.id,
          observaciones: `Subida masiva - ${empleado.nombres} ${empleado.apellidos}`
        });

        resultados.push({
          archivo: file.originalname,
          empleado: `${empleado.nombres} ${empleado.apellidos}`,
          dni: empleado.dni,
          periodo: `${mesArchivo}/${anioArchivo}`,
          status: 'ok'
        });
      } catch (err) {
        errores.push({
          archivo: file.originalname,
          error: err.message
        });
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.json({
      success: true,
      mensaje: `${resultados.length} boletas subidas correctamente`,
      data: {
        exitosos: resultados,
        errores: errores
      }
    });
  } catch (error) {
    console.error('Error en subida masiva:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Eliminar boleta
const eliminarBoleta = async (req, res) => {
  try {
    const { id } = req.params;
    
    const boleta = await BoletaPago.buscarPorId(parseInt(id));
    if (!boleta) {
      return res.status(404).json({
        success: false,
        mensaje: 'Boleta no encontrada'
      });
    }

    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../../uploads/boletas', boleta.archivo_path);
    await fs.unlink(filePath).catch(() => {});

    // Eliminar de BD
    await BoletaPago.eliminar(parseInt(id));
    
    res.json({
      success: true,
      mensaje: 'Boleta eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar boleta:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener resumen de boletas
const obtenerResumen = async (req, res) => {
  try {
    const { anio, mes } = req.query;
    
    if (!anio || !mes) {
      return res.status(400).json({
        success: false,
        mensaje: 'Año y mes son requeridos'
      });
    }

    const resumen = await BoletaPago.obtenerResumen(parseInt(anio), parseInt(mes));
    
    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener todos los años disponibles
const obtenerAnios = async (req, res) => {
  try {
    const anios = await BoletaPago.obtenerAniosDisponibles();
    
    res.json({
      success: true,
      data: anios
    });
  } catch (error) {
    console.error('Error al obtener años:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  misBoletas,
  misAniosDisponibles,
  firmarBoleta,
  descargarBoleta,
  listarBoletas,
  subirBoleta,
  subirBoletasMasivo,
  eliminarBoleta,
  obtenerResumen,
  obtenerAnios
};
