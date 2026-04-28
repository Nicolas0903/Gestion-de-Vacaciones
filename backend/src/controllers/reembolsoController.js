const fs = require('fs');
const path = require('path');
const { Reembolso, Empleado } = require('../models');
const TokenReembolso = require('../models/TokenReembolso');
const PDFService = require('../services/pdfService');
const emailService = require('../services/emailService');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

function parseBool(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function enriquecer(r) {
  if (!r) return null;
  return {
    ...r,
    codigo_ticket: Reembolso.codigoTicket(r),
    fecha_registro_ticket: r.created_at
  };
}

async function idAprobadorReembolsos() {
  const a = await Empleado.obtenerAprobadorReembolsos();
  return a ? a.id : null;
}

async function puedeGestionarReembolsosComoStaff(usuario) {
  if (usuario.rol_nombre === 'admin') return true;
  const aprobId = await idAprobadorReembolsos();
  return aprobId != null && usuario.id === aprobId;
}

const crear = async (req, res) => {
  try {
    const {
      fecha_solicitud_usuario,
      concepto,
      tiene_comprobante,
      metodo_reembolso,
      celular,
      nombre_en_metodo,
      numero_cuenta,
      monto
    } = req.body;

    const tComp = parseBool(tiene_comprobante);
    const nombre_completo = `${req.usuario.nombres || ''} ${req.usuario.apellidos || ''}`.trim();
    const dni = req.usuario.dni || '';

    if (!fecha_solicitud_usuario || !concepto?.trim()) {
      return res.status(400).json({ success: false, mensaje: 'Fecha y concepto son obligatorios.' });
    }
    if (!metodo_reembolso || !String(celular || '').trim()) {
      return res.status(400).json({ success: false, mensaje: 'Complete método de reembolso y celular.' });
    }
    const metodos = ['yape', 'plin', 'transferencia'];
    if (!metodos.includes(metodo_reembolso)) {
      return res.status(400).json({ success: false, mensaje: 'Método de reembolso no válido.' });
    }
    if (metodo_reembolso !== 'transferencia' && !String(nombre_en_metodo || '').trim()) {
      return res.status(400).json({
        success: false,
        mensaje: 'Indique el nombre que debe figurar en Yape o Plin.'
      });
    }

    if (tComp && !req.file) {
      return res.status(400).json({ success: false, mensaje: 'Debe adjuntar el comprobante de pago.' });
    }
    if (!tComp && req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'Marcó que no tiene comprobante; no adjunte archivo o indique que sí tiene comprobante.'
      });
    }

    let archivo_comprobante_nombre = null;
    let archivo_comprobante_path = null;
    if (req.file) {
      archivo_comprobante_nombre = req.file.originalname;
      archivo_comprobante_path = req.file.path;
    }

    const montoNum = monto !== undefined && monto !== '' ? parseFloat(monto, 10) : 0;
    if (Number.isNaN(montoNum) || montoNum < 0) {
      return res.status(400).json({ success: false, mensaje: 'Monto no válido.' });
    }

    const id = await Reembolso.crear({
      empleado_id: req.usuario.id,
      fecha_solicitud_usuario,
      concepto: concepto.trim(),
      nombre_completo,
      dni,
      tiene_comprobante: tComp,
      archivo_comprobante_nombre,
      archivo_comprobante_path,
      archivo_recibo_generado_path: null,
      metodo_reembolso,
      celular: String(celular).trim(),
      nombre_en_metodo: String(nombre_en_metodo || '').trim(),
      numero_cuenta:
        metodo_reembolso === 'transferencia'
          ? String(numero_cuenta || '').trim() || null
          : null,
      monto: montoNum
    });

    let row = await Reembolso.buscarPorId(id);
    const codigo = Reembolso.codigoTicket(row);

    let pdfReciboBuffer = null;
    if (!tComp) {
      const datosPdf = { ...row, codigo_ticket: codigo };
      pdfReciboBuffer = await PDFService.generarReciboReembolso(datosPdf);
      const reciboDir = path.join(__dirname, '../../uploads/reembolsos/recibos');
      if (!fs.existsSync(reciboDir)) {
        fs.mkdirSync(reciboDir, { recursive: true });
      }
      const reciboPath = path.join(reciboDir, `${codigo}.pdf`);
      fs.writeFileSync(reciboPath, pdfReciboBuffer);
      await Reembolso.actualizarArchivoRecibo(id, reciboPath);
      row = await Reembolso.buscarPorId(id);
    }

    const aprobador = await Empleado.obtenerAprobadorReembolsos();
    if (aprobador) {
      const tokenAprobar = await TokenReembolso.crear(id, aprobador.id, 'aprobar');
      const tokenRechazar = await TokenReembolso.crear(id, aprobador.id, 'rechazar');
      const urlAprobar = `${API_URL}/aprobacion-reembolso-email/aprobar/${tokenAprobar}`;
      const urlRechazar = `${API_URL}/aprobacion-reembolso-email/rechazar/${tokenRechazar}`;

      emailService
        .notificarNuevaSolicitudReembolsoAprobador({
          reembolso: row,
          empleado: req.usuario,
          aprobador,
          urlAprobar,
          urlRechazar,
          pdfReciboBuffer: !tComp ? pdfReciboBuffer : null,
          comprobanteDiskPath: tComp ? archivo_comprobante_path : null,
          comprobanteNombreOriginal: archivo_comprobante_nombre
        })
        .catch((e) => console.error('Email reembolso:', e));
    } else {
      console.error(
        'Reembolsos: no se encontró aprobador en empleados (Enrique Agapito o REEMBOLSOS_APROBADOR_EMPLEADO_ID). No se envió correo.'
      );
    }

    res.status(201).json({
      success: true,
      mensaje: 'Solicitud registrada. Se notificó al aprobador.',
      data: enriquecer(row)
    });
  } catch (error) {
    console.error('crear reembolso:', error);
    res.status(500).json({ success: false, mensaje: 'Error al registrar la solicitud.' });
  }
};

const misSolicitudes = async (req, res) => {
  try {
    const rows = await Reembolso.listarPorEmpleado(req.usuario.id);
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const listarPendientes = async (req, res) => {
  try {
    const rows = await Reembolso.listarPendientes();
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const listarTodos = async (req, res) => {
  try {
    const { estado } = req.query;
    const rows = await Reembolso.listarTodos(estado ? { estado } : {});
    res.json({ success: true, data: rows.map(enriquecer) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al listar.' });
  }
};

const obtener = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await Reembolso.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const esDueño = r.empleado_id === req.usuario.id;
    const esStaff = await puedeGestionarReembolsosComoStaff(req.usuario);
    if (!esDueño && !esStaff) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso.' });
    }
    res.json({ success: true, data: enriquecer(r) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error.' });
  }
};

const descargarReciboPdf = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await Reembolso.buscarPorId(id);
    if (!r || !r.archivo_recibo_generado_path) {
      return res.status(404).json({ success: false, mensaje: 'Recibo no disponible.' });
    }
    const esStaff = await puedeGestionarReembolsosComoStaff(req.usuario);
    if (r.empleado_id !== req.usuario.id && !esStaff) {
      return res.status(403).json({ success: false, mensaje: 'Sin permiso.' });
    }
    if (!fs.existsSync(r.archivo_recibo_generado_path)) {
      return res.status(404).json({ success: false, mensaje: 'Archivo no encontrado.' });
    }
    const codigo = Reembolso.codigoTicket(r);
    res.download(r.archivo_recibo_generado_path, `${codigo}.pdf`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al descargar.' });
  }
};

const descargarComprobante = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await Reembolso.buscarPorId(id);
    if (!r || !r.archivo_comprobante_path) {
      return res.status(404).json({ success: false, mensaje: 'Sin comprobante.' });
    }
    const esStaff = await puedeGestionarReembolsosComoStaff(req.usuario);
    if (r.empleado_id !== req.usuario.id && !esStaff) {
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
    const r = await Reembolso.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await Reembolso.aprobar(id, req.usuario.id, comentarios || null);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo aprobar (¿ya procesada?).' });
    }
    await TokenReembolso.invalidarTodosReembolso(id);
    const actualizado = await Reembolso.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarReembolsoResueltoEmpleado(
        actualizado,
        empleado,
        'aprobado',
        req.usuario,
        comentarios || null
      )
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Aprobado.', data: enriquecer(actualizado) });
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
    const r = await Reembolso.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await Reembolso.rechazar(id, req.usuario.id, String(comentarios).trim());
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo rechazar (¿ya procesada?).' });
    }
    await TokenReembolso.invalidarTodosReembolso(id);
    const actualizado = await Reembolso.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarReembolsoResueltoEmpleado(actualizado, empleado, 'rechazado', req.usuario, comentarios)
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Rechazado.', data: enriquecer(actualizado) });
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
    const r = await Reembolso.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    const ok = await Reembolso.marcarObservado(id, req.usuario.id, String(comentarios).trim());
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo registrar (¿solo pendientes?).' });
    }
    await TokenReembolso.invalidarTodosReembolso(id);
    const actualizado = await Reembolso.buscarPorId(id);
    const empleado = await Empleado.buscarPorId(r.empleado_id);
    emailService
      .notificarReembolsoResueltoEmpleado(actualizado, empleado, 'observado', req.usuario, comentarios)
      .catch((e) => console.error(e));
    res.json({ success: true, mensaje: 'Marcado como observado.', data: enriquecer(actualizado) });
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
    console.warn('unlink reembolso:', e.message);
  }
}

const eliminar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const r = await Reembolso.buscarPorId(id);
    if (!r) {
      return res.status(404).json({ success: false, mensaje: 'No encontrado.' });
    }
    unlinkSeguro(r.archivo_comprobante_path);
    unlinkSeguro(r.archivo_recibo_generado_path);
    const ok = await Reembolso.eliminarPorId(id);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo eliminar.' });
    }
    res.json({ success: true, mensaje: 'Registro eliminado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar.' });
  }
};

module.exports = {
  crear,
  misSolicitudes,
  listarPendientes,
  listarTodos,
  obtener,
  descargarReciboPdf,
  descargarComprobante,
  aprobar,
  rechazar,
  observar,
  eliminar
};
