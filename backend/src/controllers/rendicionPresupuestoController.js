const fs = require('fs');
const { RendicionPresupuesto, Empleado } = require('../models');
const TokenRendicionPresupuesto = require('../models/TokenRendicionPresupuesto');
const emailService = require('../services/emailService');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

function enriquecer(r) {
  if (!r) return null;
  return {
    ...r,
    codigo_ticket: RendicionPresupuesto.codigoTicket(r),
    area_label: RendicionPresupuesto.AREAS_LABEL[r.area] || r.area,
    fecha_registro_ticket: r.created_at
  };
}

/** El aprobador y staff de gestión son SIEMPRE admins en este módulo. */
function esStaffRendicion(usuario) {
  return usuario?.rol_nombre === 'admin';
}

const crear = async (req, res) => {
  try {
    const { fecha_solicitud_usuario, area, concepto, monto } = req.body;

    const nombre_completo = `${req.usuario.nombres || ''} ${req.usuario.apellidos || ''}`.trim();
    const dni = req.usuario.dni || '';

    if (!fecha_solicitud_usuario || !concepto?.trim()) {
      return res.status(400).json({ success: false, mensaje: 'Fecha y concepto son obligatorios.' });
    }
    if (!area || !RendicionPresupuesto.AREAS_VALIDAS.includes(area)) {
      return res.status(400).json({ success: false, mensaje: 'Indique un área válida.' });
    }

    const montoNum = monto !== undefined && monto !== '' ? parseFloat(monto, 10) : 0;
    if (Number.isNaN(montoNum) || montoNum < 0) {
      return res.status(400).json({ success: false, mensaje: 'Monto no válido.' });
    }

    let archivo_comprobante_nombre = null;
    let archivo_comprobante_path = null;
    if (req.file) {
      archivo_comprobante_nombre = req.file.originalname;
      archivo_comprobante_path = req.file.path;
    }

    const id = await RendicionPresupuesto.crear({
      empleado_id: req.usuario.id,
      fecha_solicitud_usuario,
      area,
      concepto: concepto.trim(),
      nombre_completo,
      dni,
      tiene_comprobante: !!req.file,
      archivo_comprobante_nombre,
      archivo_comprobante_path,
      archivo_recibo_generado_path: null,
      monto: montoNum,
      ruc_proveedor: null,
      numero_documento: null
    });

    const row = await RendicionPresupuesto.buscarPorId(id);

    const aprobadores = await Empleado.obtenerAprobadoresRendicion();
    if (aprobadores.length === 0) {
      console.error(
        'Rendiciones: no se encontró ningún aprobador activo (Magali, Ricardo o Verónica). No se envió correo.'
      );
    } else {
      const rendicionData = {
        ...row,
        area_label: RendicionPresupuesto.AREAS_LABEL[row.area] || row.area
      };

      for (const aprobador of aprobadores) {
        const tokenAprobar = await TokenRendicionPresupuesto.crear(id, aprobador.id, 'aprobar');
        const tokenRechazar = await TokenRendicionPresupuesto.crear(id, aprobador.id, 'rechazar');
        const urlAprobar = `${API_URL}/aprobacion-rendicion-email/aprobar/${tokenAprobar}`;
        const urlRechazar = `${API_URL}/aprobacion-rendicion-email/rechazar/${tokenRechazar}`;

        emailService
          .notificarNuevaRendicionAdmin({
            rendicion: rendicionData,
            empleado: req.usuario,
            aprobador,
            urlAprobar,
            urlRechazar,
            comprobanteDiskPath: archivo_comprobante_path,
            comprobanteNombreOriginal: archivo_comprobante_nombre
          })
          .catch((e) => console.error(`Email rendición (${aprobador.email}):`, e));
      }
    }

    res.status(201).json({
      success: true,
      mensaje: 'Rendición registrada. Se notificó a los responsables.',
      data: enriquecer(row)
    });
  } catch (error) {
    console.error('crear rendición:', error);
    res.status(500).json({ success: false, mensaje: 'Error al registrar la rendición.' });
  }
};

const misSolicitudes = async (req, res) => {
  try {
    const rows = await RendicionPresupuesto.listarPorEmpleado(req.usuario.id);
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const listarPendientes = async (req, res) => {
  try {
    const rows = await RendicionPresupuesto.listarPendientes();
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const listarTodos = async (req, res) => {
  try {
    const { estado, area } = req.query;
    const filtros = {};
    if (estado) filtros.estado = estado;
    if (area) filtros.area = area;
    const rows = await RendicionPresupuesto.listarTodos(filtros);
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const obtener = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const esDueño = r.empleado_id === req.usuario.id;
    if (!esDueño && !esStaffRendicion(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso.' });
    }
    res.json({ success: true, data: enriquecer(r) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error.' });
  }
};

const descargarComprobante = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r || !r.archivo_comprobante_path) {
      return res.status(404).json({ success: false, mensaje: 'Sin comprobante.' });
    }
    if (r.empleado_id !== req.usuario.id && !esStaffRendicion(req.usuario)) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso.' });
    }
    if (!fs.existsSync(r.archivo_comprobante_path)) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no encontrado.' });
    }
    res.download(r.archivo_comprobante_path, r.archivo_comprobante_nombre || 'comprobante');
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al descargar.' });
  }
};

const aprobar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { comentarios } = req.body;
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await RendicionPresupuesto.aprobar(id, req.usuario.id, comentarios || null);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo aprobar (¿ya procesada?).' });
    }
    await TokenRendicionPresupuesto.invalidarTodos(id);
    const actualizado = await RendicionPresupuesto.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarRendicionResueltaEmpleado(actualizado, empleado, 'aprobado', req.usuario, comentarios || null)
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Aprobada.', data: enriquecer(actualizado) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error.' });
  }
};

const rechazar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { comentarios } = req.body;
    if (!comentarios || !String(comentarios).trim()) {
      return res.status(400).json({ success: false, mensaje: 'Indique el motivo del rechazo.' });
    }
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await RendicionPresupuesto.rechazar(id, req.usuario.id, String(comentarios).trim());
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo rechazar (¿ya procesada?).' });
    }
    await TokenRendicionPresupuesto.invalidarTodos(id);
    const actualizado = await RendicionPresupuesto.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarRendicionResueltaEmpleado(actualizado, empleado, 'rechazado', req.usuario, comentarios)
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Rechazada.', data: enriquecer(actualizado) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error.' });
  }
};

const observar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { comentarios } = req.body;
    if (!comentarios || !String(comentarios).trim()) {
      return res.status(400).json({ success: false, mensaje: 'Indique las observaciones.' });
    }
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await RendicionPresupuesto.marcarObservado(id, req.usuario.id, String(comentarios).trim());
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo registrar (¿solo pendientes?).' });
    }
    await TokenRendicionPresupuesto.invalidarTodos(id);
    const actualizado = await RendicionPresupuesto.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarRendicionResueltaEmpleado(actualizado, empleado, 'observado', req.usuario, comentarios)
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Marcada como observada.', data: enriquecer(actualizado) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error.' });
  }
};

function unlinkSeguro(p) {
  try {
    if (p && fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  } catch (e) {
    console.warn('unlink rendición:', e.message);
  }
}

const eliminar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    unlinkSeguro(r.archivo_comprobante_path);
    unlinkSeguro(r.archivo_recibo_generado_path);
    const ok = await RendicionPresupuesto.eliminarPorId(id);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo eliminar.' });
    }
    res.json({ success: true, mensaje: 'Registro eliminado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar.' });
  }
};

const actualizarAdmin = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await RendicionPresupuesto.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }

    const { fecha_solicitud_usuario, area, concepto, monto } = req.body;

    if (!fecha_solicitud_usuario || !String(concepto || '').trim()) {
      return res.status(400).json({ success: false, mensaje: 'Fecha y concepto son obligatorios.' });
    }
    if (!area || !RendicionPresupuesto.AREAS_VALIDAS.includes(area)) {
      return res.status(400).json({ success: false, mensaje: 'Indique un área válida.' });
    }

    const montoNum = monto !== undefined && monto !== '' ? parseFloat(monto, 10) : 0;
    if (Number.isNaN(montoNum) || montoNum < 0) {
      return res.status(400).json({ success: false, mensaje: 'Monto no válido.' });
    }

    let archivo_comprobante_nombre = r.archivo_comprobante_nombre;
    let archivo_comprobante_path = r.archivo_comprobante_path;
    let tieneComprobante = !!r.tiene_comprobante;
    if (req.file) {
      unlinkSeguro(r.archivo_comprobante_path);
      archivo_comprobante_nombre = req.file.originalname;
      archivo_comprobante_path = req.file.path;
      tieneComprobante = true;
    }

    const ok = await RendicionPresupuesto.actualizarPorAdmin(id, {
      fecha_solicitud_usuario,
      area,
      concepto: String(concepto).trim(),
      monto: montoNum,
      tiene_comprobante: tieneComprobante,
      archivo_comprobante_nombre,
      archivo_comprobante_path
    });

    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo actualizar.' });
    }

    const actualizado = await RendicionPresupuesto.buscarPorId(id);
    res.json({ success: true, mensaje: 'Rendición actualizada.', data: enriquecer(actualizado) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al actualizar.' });
  }
};

const catalogoAreas = (_req, res) => {
  res.json({
    success: true,
    data: RendicionPresupuesto.AREAS_VALIDAS.map((v) => ({
      value: v,
      label: RendicionPresupuesto.AREAS_LABEL[v]
    }))
  });
};

module.exports = {
  crear,
  misSolicitudes,
  listarPendientes,
  listarTodos,
  obtener,
  descargarComprobante,
  aprobar,
  rechazar,
  observar,
  eliminar,
  actualizarAdmin,
  catalogoAreas
};
