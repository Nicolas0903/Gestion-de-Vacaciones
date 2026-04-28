const { Reembolso, CajaChica } = require('../models');

const TIPOS_INGRESO_LABEL = {
  caja_chica: 'Caja chica',
  deposito_adicional: 'Depósito adicional del mes',
  saldo_anterior: 'Saldo a favor de la caja chica anterior'
};

function ultimoDiaMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

function rangoMes(anio, mes) {
  const m = String(mes).padStart(2, '0');
  const desde = `${anio}-${m}-01`;
  const dia = ultimoDiaMes(anio, mes);
  const hasta = `${anio}-${m}-${String(dia).padStart(2, '0')}`;
  return { desde, hasta };
}

function mapEgresoRow(r) {
  const codigo = Reembolso.codigoTicket(r);
  const tiene = !!r.tiene_comprobante;
  return {
    reembolso_id: r.id,
    fecha_documento: r.fecha_solicitud_usuario,
    ruc_proveedor: tiene ? '—' : 'Recibo Prayaga',
    numero_documento: tiene
      ? r.archivo_comprobante_nombre || '—'
      : codigo,
    descripcion: r.concepto,
    monto: Number(r.monto) || 0,
    codigo_ticket: codigo,
    tiene_comprobante: tiene
  };
}

const listarPeriodos = async (req, res) => {
  try {
    const rows = await CajaChica.listarPeriodos();
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al listar períodos.' });
  }
};

const crearPeriodo = async (req, res) => {
  try {
    const anio = parseInt(req.body.anio, 10);
    const mes = parseInt(req.body.mes, 10);
    if (!anio || mes < 1 || mes > 12) {
      return res.status(400).json({ success: false, mensaje: 'Año y mes no válidos.' });
    }
    const existe = await CajaChica.buscarPeriodoPorAnioMes(anio, mes);
    if (existe) {
      return res.status(409).json({ success: false, mensaje: 'Ya existe un período para ese mes.' });
    }
    const id = await CajaChica.crearPeriodo(anio, mes);
    const row = await CajaChica.buscarPeriodoPorId(id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al crear período.' });
  }
};

const detallePeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
    const [ingresosRows, reembolsos] = await Promise.all([
      CajaChica.listarIngresos(id),
      Reembolso.listarAprobadosPorRangoFechaDocumento(desde, hasta)
    ]);

    const ingresos = ingresosRows.map((row) => ({
      id: row.id,
      tipo_motivo: row.tipo_motivo,
      motivo_label: TIPOS_INGRESO_LABEL[row.tipo_motivo] || row.tipo_motivo,
      monto: Number(row.monto),
      orden: row.orden
    }));

    const totalIngreso = ingresos.reduce((s, x) => s + x.monto, 0);
    const egresos = reembolsos.map(mapEgresoRow);
    const totalEgreso = egresos.reduce((s, x) => s + x.monto, 0);
    const saldoCalculado = totalIngreso - totalEgreso;
    const saldoAnteriorSugerido = await CajaChica.saldoCierrePeriodoAnterior(periodo.anio, periodo.mes);

    res.json({
      success: true,
      data: {
        periodo,
        ingresos,
        egresos,
        totales: {
          total_ingreso: totalIngreso,
          total_egreso: totalEgreso,
          saldo: saldoCalculado
        },
        saldo_anterior_sugerido: saldoAnteriorSugerido,
        rango_fecha_documento: { desde, hasta }
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cargar el período.' });
  }
};

const guardarIngresos = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'Solo se editan ingresos en borrador.' });
    }
    const lineas = Array.isArray(req.body.ingresos) ? req.body.ingresos : [];
    await CajaChica.reemplazarIngresos(id, lineas);
    const ingresos = await CajaChica.listarIngresos(id);
    res.json({
      success: true,
      data: ingresos.map((row) => ({
        id: row.id,
        tipo_motivo: row.tipo_motivo,
        motivo_label: TIPOS_INGRESO_LABEL[row.tipo_motivo],
        monto: Number(row.monto),
        orden: row.orden
      }))
    });
  } catch (e) {
    console.error(e);
    const msg = e.message === 'Monto inválido' || e.message === 'tipo_motivo no válido' ? e.message : 'Error al guardar ingresos.';
    res.status(400).json({ success: false, mensaje: msg });
  }
};

const cerrarPeriodo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const periodo = await CajaChica.buscarPeriodoPorId(id);
    if (!periodo) {
      return res.status(404).json({ success: false, mensaje: 'Período no encontrado.' });
    }
    if (periodo.estado !== 'borrador') {
      return res.status(400).json({ success: false, mensaje: 'El período ya está cerrado.' });
    }
    const { desde, hasta } = rangoMes(periodo.anio, periodo.mes);
    const [ingresosRows, reembolsos] = await Promise.all([
      CajaChica.listarIngresos(id),
      Reembolso.listarAprobadosPorRangoFechaDocumento(desde, hasta)
    ]);
    const totalIngreso = ingresosRows.reduce((s, r) => s + Number(r.monto), 0);
    const totalEgreso = reembolsos.reduce((s, r) => s + (Number(r.monto) || 0), 0);
    const saldo = totalIngreso - totalEgreso;
    const ok = await CajaChica.cerrarPeriodo(id, saldo);
    if (!ok) {
      return res.status(400).json({ success: false, mensaje: 'No se pudo cerrar el período.' });
    }
    const actualizado = await CajaChica.buscarPeriodoPorId(id);
    res.json({
      success: true,
      mensaje: 'Período cerrado. El saldo quedará disponible para el mes siguiente.',
      data: {
        periodo: actualizado,
        totales: {
          total_ingreso: totalIngreso,
          total_egreso: totalEgreso,
          saldo
        }
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, mensaje: 'Error al cerrar período.' });
  }
};

module.exports = {
  listarPeriodos,
  crearPeriodo,
  detallePeriodo,
  guardarIngresos,
  cerrarPeriodo
};
