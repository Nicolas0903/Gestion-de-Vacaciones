const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const BackupSnapshot = require('../models/BackupSnapshot');
const emailService = require('./emailService');

const BACKUP_ROOT = path.join(__dirname, '../../backups');
const TIMEZONE = process.env.BACKUP_TIMEZONE || 'America/Lima';
const RETENTION_DAYS = Math.max(Number(process.env.BACKUP_RETENTION_DAYS) || 90, 7);
const MAX_EMAIL_MB = Math.max(Number(process.env.BACKUP_MAX_EMAIL_ATTACHMENT_MB) || 8, 1);

let ejecutando = false;

async function columnaExiste(tabla, columna) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [tabla, columna]
  );
  return rows.length > 0;
}

/** Consultas legibles: columnas en español, sin passwords ni rutas internas. */
async function getExportSheets() {
  const tieneAreaEmpleado = await columnaExiste('empleados', 'area');
  const colArea = tieneAreaEmpleado ? `e.area AS 'Área',` : '';

  return [
    {
      name: 'Empleados',
      descripcion: 'Directorio del personal registrado en el portal',
      tabla: 'empleados',
      sql: `
        SELECT
          e.codigo_empleado AS 'Código',
          e.apellidos AS 'Apellidos',
          e.nombres AS 'Nombres',
          e.email AS 'Correo',
          e.dni AS 'DNI',
          e.cargo AS 'Cargo',
          ${colArea}
          r.nombre AS 'Rol',
          r.nivel_aprobacion AS 'Nivel aprobación',
          TRIM(CONCAT(IFNULL(j.nombres, ''), ' ', IFNULL(j.apellidos, ''))) AS 'Jefe directo',
          CASE WHEN e.activo = 1 THEN 'Activo' ELSE 'Inactivo' END AS 'Estado',
          CASE WHEN IFNULL(e.es_consultor_cp, 0) = 1 THEN 'Sí' ELSE 'No' END AS 'Consultor bolsa horas',
          e.fecha_ingreso AS 'Fecha ingreso',
          DATE_FORMAT(e.created_at, '%Y-%m-%d') AS 'Alta en sistema'
        FROM empleados e
        LEFT JOIN roles r ON r.id = e.rol_id
        LEFT JOIN empleados j ON j.id = e.jefe_id
        ORDER BY e.apellidos, e.nombres`
    },
    {
      name: 'Periodos vacaciones',
      descripcion: 'Saldo de días por período anual de cada colaborador',
      tabla: 'periodos_vacaciones',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          e.email AS 'Correo',
          pv.fecha_inicio_periodo AS 'Inicio período',
          pv.fecha_fin_periodo AS 'Fin período',
          pv.dias_correspondientes AS 'Días correspondientes',
          pv.dias_gozados AS 'Días gozados',
          pv.dias_pendientes AS 'Días pendientes',
          pv.estado AS 'Estado',
          pv.tiempo_trabajado AS 'Tiempo trabajado',
          pv.observaciones AS 'Observaciones'
        FROM periodos_vacaciones pv
        JOIN empleados e ON e.id = pv.empleado_id
        ORDER BY pv.fecha_inicio_periodo DESC, e.apellidos`
    },
    {
      name: 'Solicitudes vacaciones',
      descripcion: 'Pedidos de vacaciones y su estado de aprobación',
      tabla: 'solicitudes_vacaciones',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          e.email AS 'Correo',
          sv.fecha_inicio_vacaciones AS 'Desde',
          sv.fecha_fin_vacaciones AS 'Hasta',
          sv.dias_solicitados AS 'Días',
          sv.fecha_efectiva_salida AS 'Salida efectiva',
          sv.fecha_efectiva_regreso AS 'Regreso efectivo',
          sv.estado AS 'Estado',
          sv.observaciones AS 'Observaciones',
          DATE_FORMAT(sv.fecha_solicitud, '%Y-%m-%d %H:%i') AS 'Fecha solicitud'
        FROM solicitudes_vacaciones sv
        JOIN empleados e ON e.id = sv.empleado_id
        ORDER BY sv.fecha_solicitud DESC`
    },
    {
      name: 'Permisos descansos',
      descripcion: 'Permisos y descansos médicos',
      tabla: 'permisos_descansos',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          pd.tipo AS 'Tipo',
          pd.fecha_inicio AS 'Desde',
          pd.fecha_fin AS 'Hasta',
          pd.dias_totales AS 'Días',
          pd.motivo AS 'Motivo',
          pd.estado AS 'Estado',
          pd.archivo_nombre AS 'Documento adjunto',
          pd.observaciones AS 'Observaciones',
          DATE_FORMAT(pd.created_at, '%Y-%m-%d') AS 'Registrado'
        FROM permisos_descansos pd
        JOIN empleados e ON e.id = pd.empleado_id
        ORDER BY pd.fecha_inicio DESC`
    },
    {
      name: 'Reintegros',
      descripcion: 'Solicitudes de reintegro / reembolso de gastos',
      tabla: 'solicitudes_reembolso',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          sr.fecha_solicitud_usuario AS 'Fecha gasto',
          sr.concepto AS 'Concepto',
          sr.monto AS 'Monto (S/)',
          sr.metodo_reembolso AS 'Método pago',
          sr.estado AS 'Estado',
          sr.nombre_completo AS 'Nombre en comprobante',
          sr.ruc_proveedor AS 'RUC proveedor',
          sr.numero_documento AS 'N° documento',
          sr.archivo_comprobante_nombre AS 'Comprobante',
          sr.comentarios_resolucion AS 'Comentarios resolución',
          DATE_FORMAT(sr.created_at, '%Y-%m-%d') AS 'Registrado'
        FROM solicitudes_reembolso sr
        JOIN empleados e ON e.id = sr.empleado_id
        ORDER BY sr.created_at DESC`
    },
    {
      name: 'Rendicion presupuesto',
      descripcion: 'Rendiciones de presupuesto por área',
      tabla: 'rendiciones_presupuesto',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          rp.area AS 'Área',
          rp.moneda AS 'Moneda',
          rp.monto AS 'Monto',
          rp.concepto AS 'Concepto',
          rp.estado AS 'Estado',
          rp.archivo_comprobante_nombre AS 'Comprobante',
          DATE_FORMAT(rp.created_at, '%Y-%m-%d') AS 'Registrado'
        FROM rendiciones_presupuesto rp
        JOIN empleados e ON e.id = rp.empleado_id
        ORDER BY rp.created_at DESC`
    },
    {
      name: 'Caja chica periodos',
      descripcion: 'Periodos mensuales de rendición de caja chica',
      tabla: 'caja_chica_periodos',
      sql: `
        SELECT
          anio AS 'Año',
          mes AS 'Mes',
          estado AS 'Estado',
          saldo_cierre AS 'Saldo cierre',
          DATE_FORMAT(created_at, '%Y-%m-%d') AS 'Creado'
        FROM caja_chica_periodos
        ORDER BY anio DESC, mes DESC`
    },
    {
      name: 'Caja chica ingresos',
      descripcion: 'Ingresos y egresos detallados por periodo de caja chica',
      tabla: 'caja_chica_ingresos',
      sql: `
        SELECT
          cp.anio AS 'Año',
          cp.mes AS 'Mes',
          ci.tipo_motivo AS 'Tipo / motivo',
          ci.monto AS 'Monto',
          ci.fecha_deposito AS 'Fecha depósito',
          ci.comprobante_archivo AS 'Comprobante',
          ci.orden AS 'Orden'
        FROM caja_chica_ingresos ci
        JOIN caja_chica_periodos cp ON cp.id = ci.periodo_id
        ORDER BY cp.anio DESC, cp.mes DESC, ci.orden, ci.id`
    },
    {
      name: 'Rendicion caja',
      descripcion: 'Rendiciones de presupuesto depositadas (caja)',
      tabla: 'rendicion_caja_periodos',
      sql: `
        SELECT
          anio AS 'Año',
          mes AS 'Mes',
          estado AS 'Estado',
          total_cierre AS 'Total al cierre',
          DATE_FORMAT(created_at, '%Y-%m-%d') AS 'Creado'
        FROM rendicion_caja_periodos
        ORDER BY anio DESC, mes DESC`
    },
    {
      name: 'Proveedores',
      descripcion: 'Proveedores registrados y datos de contacto',
      tabla: 'proveedores',
      sql: `
        SELECT
          razon_social AS 'Razón social',
          tipo_proveedor AS 'Tipo',
          tipo_proveedor_otro AS 'Tipo (otro)',
          producto_servicio AS 'Producto / servicio',
          area_solicitante AS 'Área solicitante',
          nombre_contacto_proveedor AS 'Contacto proveedor',
          contacto_prayaga AS 'Contacto Prayaga',
          website AS 'Web',
          CASE WHEN activo = 1 THEN 'Activo' ELSE 'Inactivo' END AS 'Estado',
          DATE_FORMAT(fecha_registro, '%Y-%m-%d') AS 'Fecha registro'
        FROM proveedores
        ORDER BY razon_social`
    },
    {
      name: 'Evaluaciones proveedor',
      descripcion: 'Procesos de evaluación y selección de proveedores',
      tabla: 'evaluaciones_proveedor',
      sql: `
        SELECT
          DATE_FORMAT(fecha, '%Y-%m-%d') AS 'Fecha',
          oc_asociada AS 'OC asociada',
          detalle AS 'Detalle',
          estado AS 'Estado',
          DATE_FORMAT(created_at, '%Y-%m-%d') AS 'Registrado'
        FROM evaluaciones_proveedor
        ORDER BY fecha DESC`
    },
    {
      name: 'Reevaluaciones proveedor',
      descripcion: 'Reevaluaciones periódicas de proveedores afiliados',
      tabla: 'reevaluaciones_proveedor',
      sql: `
        SELECT
          pr.razon_social AS 'Proveedor',
          r.producto_servicio AS 'Producto / servicio',
          r.criterio_seleccion AS 'Criterio',
          r.conformidad AS 'Conformidad',
          r.fecha_revaluacion AS 'Fecha revaluación',
          r.puntaje_habido AS 'Puntaje habido',
          r.puntaje_entrega_efectiva AS 'Puntaje entrega',
          r.puntaje_precio_mercado AS 'Puntaje precio',
          r.proxima_revaluacion AS 'Próxima revaluación',
          DATE_FORMAT(r.created_at, '%Y-%m-%d') AS 'Registrado'
        FROM reevaluaciones_proveedor r
        JOIN proveedores pr ON pr.id = r.proveedor_id
        ORDER BY r.fecha_revaluacion DESC`
    },
    {
      name: 'Bolsa horas proyectos',
      descripcion: 'Proyectos y bolsas de horas asignadas',
      tabla: 'cp_proyectos',
      sql: `
        SELECT
          p.empresa AS 'Empresa',
          p.proyecto AS 'Proyecto',
          p.fecha_inicio AS 'Inicio',
          p.fecha_fin AS 'Fin',
          p.horas_asignadas AS 'Horas asignadas',
          p.estado AS 'Estado',
          TRIM(CONCAT(IFNULL(enc.nombres, ''), ' ', IFNULL(enc.apellidos, ''))) AS 'Encargado',
          p.detalles AS 'Detalles'
        FROM cp_proyectos p
        LEFT JOIN empleados enc ON enc.id = p.encargado_empleado_id
        ORDER BY p.fecha_inicio DESC`
    },
    {
      name: 'Bolsa horas actividades',
      descripcion: 'Registro de horas por actividad y consultor',
      tabla: 'cp_actividades',
      sql: `
        SELECT
          p.empresa AS 'Empresa',
          p.proyecto AS 'Proyecto',
          CONCAT(ec.apellidos, ', ', ec.nombres) AS 'Consultor',
          a.descripcion_actividad AS 'Actividad',
          a.prioridad AS 'Prioridad',
          a.fecha_hora_inicio AS 'Inicio',
          a.fecha_hora_fin AS 'Fin',
          a.horas_trabajadas AS 'Horas',
          a.estado AS 'Estado actividad',
          a.situacion_pago AS 'Situación pago',
          a.requerido_por AS 'Requerido por',
          a.requerido_por_otros AS 'Requerido por (otros)'
        FROM cp_actividades a
        INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
        INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
        ORDER BY a.fecha_hora_inicio DESC`
    },
    {
      name: 'Boletas pago',
      descripcion: 'Boletas de pago subidas al portal',
      tabla: 'boletas_pago',
      sql: `
        SELECT
          CONCAT(e.apellidos, ', ', e.nombres) AS 'Empleado',
          b.anio AS 'Año',
          b.mes AS 'Mes',
          b.archivo_nombre AS 'Archivo',
          CASE WHEN b.firmada = 1 THEN 'Sí' ELSE 'No' END AS 'Firmada',
          DATE_FORMAT(b.fecha_firma, '%Y-%m-%d') AS 'Fecha firma',
          b.observaciones AS 'Observaciones',
          DATE_FORMAT(b.fecha_subida, '%Y-%m-%d') AS 'Fecha subida'
        FROM boletas_pago b
        JOIN empleados e ON e.id = b.empleado_id
        ORDER BY b.anio DESC, b.mes DESC, e.apellidos`
    },
    {
      name: 'Solicitudes registro',
      descripcion: 'Solicitudes de alta de nuevas cuentas en el portal',
      tabla: 'solicitudes_registro',
      sql: `
        SELECT
          nombres AS 'Nombres',
          apellidos AS 'Apellidos',
          email AS 'Correo',
          dni AS 'DNI',
          cargo AS 'Cargo',
          estado AS 'Estado',
          DATE_FORMAT(created_at, '%Y-%m-%d') AS 'Solicitado'
        FROM solicitudes_registro
        ORDER BY created_at DESC`
    }
  ];
}

function estiloEncabezado(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }
  };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 22;
}

function valorCelda(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && !(val instanceof Date)) {
    return JSON.stringify(val);
  }
  return val;
}

async function agregarHojaDesdeQuery(workbook, sheetDef, sql) {
  const nombre = sheetDef.name.substring(0, 31);
  const ws = workbook.addWorksheet(nombre, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  try {
    const [rows] = await pool.query(sql);
    if (!rows.length) {
      ws.addRow(['Sin registros en este módulo']);
      return { name: sheetDef.name, descripcion: sheetDef.descripcion, count: 0, ok: true };
    }

    const columnas = Object.keys(rows[0]);
    const headerRow = ws.addRow(columnas);
    estiloEncabezado(headerRow);

    rows.forEach((row) => {
      ws.addRow(columnas.map((col) => valorCelda(row[col])));
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnas.length }
    };

    ws.columns.forEach((col) => {
      let max = 12;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value != null ? String(cell.value).length : 0;
        if (len > max) max = Math.min(len, 55);
      });
      col.width = max + 2;
    });

    return { name: sheetDef.name, descripcion: sheetDef.descripcion, count: rows.length, ok: true };
  } catch (err) {
    ws.addRow([`Error al exportar: ${err.message}`]);
    return {
      name: sheetDef.name,
      descripcion: sheetDef.descripcion,
      count: 0,
      ok: false,
      error: err.message
    };
  }
}

function completarHojaResumen(ws, meta, resultados) {
  ws.spliceRows(1, ws.rowCount);

  ws.addRow(['Archivo histórico — Portal Prayaga']);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow(['Generado', meta.generado]);
  ws.addRow(['Turno', meta.turno]);
  ws.addRow([]);
  ws.addRow(['Hoja', 'Registros', 'Estado', 'Descripción']);
  estiloEncabezado(ws.getRow(5));

  resultados.forEach((r) => {
    ws.addRow([
      r.name,
      r.count,
      r.ok ? (r.count ? 'OK' : 'Vacío') : 'Error',
      r.error ? `${r.descripcion} — ${r.error}` : r.descripcion
    ]);
  });

  ws.addRow([]);
  ws.addRow([
    'Nota',
    'El volcado SQL (.sql) es copia técnica para restauración. Este Excel es la versión legible para archivo y consulta.'
  ]);

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 60;
  ws.views = [{ state: 'frozen', ySplit: 5 }];
}

async function generarExcel(rutaDestino, metaResumen = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestor Vacaciones Prayaga';
  workbook.created = new Date();
  workbook.company = 'Prayaga';

  const resumenWs = workbook.addWorksheet('Resumen', {
    views: [{ state: 'frozen', ySplit: 5 }]
  });
  resumenWs.addRow(['Generando respaldo…']);

  const exportSheets = await getExportSheets();
  const resultados = [];

  for (const sheet of exportSheets) {
    if (sheet.tabla && !(await tablaExiste(sheet.tabla))) {
      const ws = workbook.addWorksheet(sheet.name.substring(0, 31));
      ws.addRow(['Módulo no disponible en esta base de datos']);
      resultados.push({
        name: sheet.name,
        descripcion: sheet.descripcion,
        count: 0,
        ok: true
      });
      continue;
    }
    const stats = await agregarHojaDesdeQuery(workbook, sheet, sheet.sql);
    resultados.push(stats);
  }

  completarHojaResumen(resumenWs, metaResumen, resultados);

  await workbook.xlsx.writeFile(rutaDestino);
  return fs.statSync(rutaDestino).size;
}

function asegurarDirectorio(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fechaHoraPeru() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: `${get('hour')}:${get('minute')}`,
    etiqueta: `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
  };
}

function restarDiasFecha(isoDate, dias) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

function etiquetaTurno(turno) {
  return turno === 'manana' ? '08:30 (inicio jornada)' : '17:30 (fin jornada)';
}

function destinatariosBackup() {
  const raw =
    process.env.BACKUP_EMAILS ||
    'rocio.picon@prayaga.biz,nicolas.valdivia@prayaga.biz';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function tablaExiste(nombreTabla) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [nombreTabla]
  );
  return rows.length > 0;
}

function runMysqldump(rutaDestino) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h',
      process.env.DB_HOST || 'localhost',
      '-P',
      String(process.env.DB_PORT || 3306),
      '-u',
      process.env.DB_USER || 'root',
      `--password=${process.env.DB_PASSWORD || ''}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--set-gtid-purged=OFF',
      process.env.DB_NAME || 'gestor_vacaciones'
    ];

    const proc = spawn('mysqldump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = fs.createWriteStream(rutaDestino);
    let stderr = '';

    proc.stdout.pipe(out);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      out.destroy();
      reject(err);
    });

    proc.on('close', (code) => {
      out.end(() => {
        if (code !== 0) {
          try {
            fs.unlinkSync(rutaDestino);
          } catch (_) {
            /* ignore */
          }
          reject(new Error(stderr.trim() || `mysqldump salió con código ${code}`));
          return;
        }
        resolve(fs.statSync(rutaDestino).size);
      });
    });
  });
}

async function limpiarAntiguos() {
  const corte = restarDiasFecha(fechaHoraPeru().fecha, RETENTION_DAYS);
  const antiguos = await BackupSnapshot.listarAntiguos(corte);
  for (const snap of antiguos) {
    for (const p of [snap.excel_path, snap.sql_path]) {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (err) {
          console.warn('No se pudo borrar archivo de respaldo:', p, err.message);
        }
      }
    }
    await BackupSnapshot.eliminarPorId(snap.id);
  }
  if (antiguos.length) {
    console.log(`🗑️  Respaldos: eliminados ${antiguos.length} registros anteriores a ${corte}`);
  }
}

async function ejecutarRespaldo(turno) {
  if (ejecutando) {
    console.warn('⚠️  Ya hay un respaldo en curso; se omite esta ejecución.');
    return { ok: false, mensaje: 'Respaldo en curso' };
  }

  ejecutando = true;
  const { fecha, etiqueta: fechaEtiqueta } = fechaHoraPeru();
  const dirDia = path.join(BACKUP_ROOT, fecha);
  asegurarDirectorio(dirDia);

  const excelName = `archivo-prayaga-${fecha}-${turno}.xlsx`;
  const sqlName = `volcado-prayaga-${fecha}-${turno}.sql`;
  const excelPath = path.join(dirDia, excelName);
  const sqlPath = path.join(dirDia, sqlName);

  let excelBytes = 0;
  let sqlBytes = null;
  let emailEnviado = false;
  let emailAdjuntoSql = false;
  let estado = 'ok';
  const errores = [];

  try {
    console.log(`📦 Iniciando respaldo (${turno}, ${fecha})…`);
    excelBytes = await generarExcel(excelPath, {
      generado: fechaEtiqueta,
      turno: etiquetaTurno(turno)
    });
    console.log(`   Excel generado: ${(excelBytes / 1024).toFixed(1)} KB`);

    try {
      sqlBytes = await runMysqldump(sqlPath);
      console.log(`   SQL generado: ${(sqlBytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      errores.push(`SQL: ${err.message}`);
      sqlBytes = null;
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      estado = 'parcial';
    }

    const maxBytes = MAX_EMAIL_MB * 1024 * 1024;
    const totalAdjuntos = excelBytes + (sqlBytes || 0);
    const incluirSql = sqlBytes != null && totalAdjuntos <= maxBytes;

    try {
      emailEnviado = await emailService.enviarRespaldoArchivo({
        destinatarios: destinatariosBackup(),
        turno,
        fechaLabel: fechaEtiqueta,
        excelPath,
        sqlPath: incluirSql ? sqlPath : null,
        incluirSql,
        excelBytes,
        sqlBytes: incluirSql ? sqlBytes : null,
        maxEmailMb: MAX_EMAIL_MB
      });
      emailAdjuntoSql = incluirSql && emailEnviado;
    } catch (err) {
      errores.push(`Correo: ${err.message}`);
      estado = estado === 'ok' ? 'parcial' : estado;
    }

    if (!emailEnviado) {
      errores.push('No se pudo enviar el correo (revise SMTP y BACKUP_EMAILS).');
      estado = 'parcial';
    }

    const snapshot = await BackupSnapshot.crear({
      turno,
      fecha,
      excel_path: excelPath,
      sql_path: sqlBytes != null ? sqlPath : null,
      excel_bytes: excelBytes,
      sql_bytes: sqlBytes,
      email_enviado: emailEnviado,
      email_adjunto_sql: emailAdjuntoSql,
      estado: errores.length && excelBytes > 0 ? estado : errores.length ? 'error' : 'ok',
      mensaje_error: errores.length ? errores.join(' | ') : null
    });

    await limpiarAntiguos();

    console.log(`✅ Respaldo ${turno} completado (id ${snapshot.id}, estado ${snapshot.estado})`);
    return { ok: true, snapshot };
  } catch (err) {
    console.error('❌ Error en respaldo:', err);
    try {
      await BackupSnapshot.crear({
        turno,
        fecha,
        excel_path: excelPath,
        sql_path: null,
        excel_bytes: excelBytes,
        sql_bytes: null,
        email_enviado: false,
        email_adjunto_sql: false,
        estado: 'error',
        mensaje_error: err.message
      });
    } catch (_) {
      /* ignore */
    }
    return { ok: false, mensaje: err.message };
  } finally {
    ejecutando = false;
  }
}

function resolverRutaSegura(baseName) {
  const resolved = path.resolve(baseName);
  const rootResolved = path.resolve(BACKUP_ROOT);
  if (!resolved.startsWith(rootResolved)) {
    throw new Error('Ruta de archivo no permitida');
  }
  return resolved;
}

module.exports = {
  BACKUP_ROOT,
  ejecutarRespaldo,
  listarSnapshots: () => BackupSnapshot.listar(),
  obtenerSnapshot: (id) => BackupSnapshot.buscarPorId(id),
  resolverRutaSegura,
  etiquetaTurno,
  destinatariosBackup
};
