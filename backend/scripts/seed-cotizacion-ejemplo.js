/**
 * Crea o reemplaza la cotización demo COT-DEMO-2026 con datos completos de ejemplo.
 * Uso: node backend/scripts/seed-cotizacion-ejemplo.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const Cotizacion = require('../src/models/Cotizacion');
const { calcularCotizacion, uid, borradorVacio } = require('../src/services/cotizacionCalculoService');

const CODIGO_DEMO = 'COT-DEMO-2026';

function buildBorradorEjemplo(responsableId) {
  const base = borradorVacio();

  const idArq = uid();
  const idDe = uid();
  const idPm = uid();

  const perfiles = [
    { id: idArq, perfil: 'Arquitecto de datos', horas: 80, participacion_pct: 0, orden: 1 },
    { id: idDe, perfil: 'Data Engineer', horas: 120, participacion_pct: 0, orden: 2 },
    { id: idPm, perfil: 'Jefe de proyecto', horas: 40, participacion_pct: 0, orden: 3 }
  ];

  const bloques = [
    {
      id: uid(),
      nombre: 'Seguridad y gobierno',
      orden: 1,
      actividades: [
        { id: uid(), orden: 1, descripcion: 'Diseño de roles y RLS en Snowflake', horas: 40, holgura_horas: 4 },
        { id: uid(), orden: 2, descripcion: 'Políticas de acceso y auditoría', horas: 32, holgura_horas: 0 },
        { id: uid(), orden: 3, descripcion: 'Workshop de gobierno con stakeholders', horas: 24, holgura_horas: 0 }
      ]
    },
    {
      id: uid(),
      nombre: 'Modelo analítico',
      orden: 2,
      actividades: [
        { id: uid(), orden: 1, descripcion: 'Ingesta desde ERP y CRM', horas: 60, holgura_horas: 8 },
        { id: uid(), orden: 2, descripcion: 'Capa semántica y KPIs ejecutivos', horas: 48, holgura_horas: 0 },
        { id: uid(), orden: 3, descripcion: 'Validación UAT y documentación', horas: 36, holgura_horas: 0 }
      ]
    }
  ];

  const recursos = [
    {
      id: uid(),
      rol: 'Arquitecto de datos',
      cantidad: 1,
      salario: 18500,
      horas_asignadas: 80,
      sobrecosto: 1.15,
      es_informativo: false,
      perfil_actividad_id: idArq,
      orden: 1
    },
    {
      id: uid(),
      rol: 'Data Engineer',
      cantidad: 1,
      salario: 14200,
      horas_asignadas: 120,
      sobrecosto: 1.1,
      es_informativo: false,
      perfil_actividad_id: idDe,
      orden: 2
    },
    {
      id: uid(),
      rol: 'Jefe de proyecto',
      cantidad: 1,
      salario: 16800,
      horas_asignadas: 40,
      sobrecosto: 1,
      es_informativo: false,
      perfil_actividad_id: idPm,
      orden: 3
    }
  ];

  const propuesta = {
    ...base.propuesta,
    igv_pct: 18,
    inversion_roles: [
      { cantidad: 1, actividad: 'Jefe de proyecto', inversion: 8500 },
      { cantidad: 1, actividad: 'Arquitecto de datos', inversion: 12000 },
      { cantidad: 2, actividad: 'Data Engineer', inversion: 18000 }
    ],
    pagos_entregables: [
      { descripcion: 'Kick-off y plan de trabajo', porcentaje: 0.2 },
      { descripcion: 'Entrega gobierno + ingesta', porcentaje: 0.35 },
      { descripcion: 'Entrega modelo y tableros', porcentaje: 0.3 },
      { descripcion: 'Cierre UAT y handover', porcentaje: 0.15 }
    ],
    detalle: [
      { actividad: 'Servicios de consultoría Snowflake (240 h)', horas: 240, precio: 95000 },
      { actividad: 'Soporte post go-live (opcional)', horas: 0, precio: 0 }
    ],
    pagos_forma: [
      { descripcion: 'Anticipo a la firma', porcentaje: 0.3 },
      { descripcion: 'Contra entregable intermedio', porcentaje: 0.4 },
      { descripcion: 'Saldo al cierre', porcentaje: 0.3 }
    ]
  };

  return calcularCotizacion({
    general: {
      ...base.general,
      codigo: CODIGO_DEMO,
      estado: 'en_revision',
      nombre_proyecto: 'Implementación analítica Snowflake — demo',
      cliente: 'Cliente ejemplo S.A.',
      tipo_proyecto_codigo: '7002',
      tipo_proyecto: 'CONSULTORIA',
      responsable_ids: [responsableId],
      responsable_id: responsableId,
      notas_internas:
        'Cotización de demostración generada por seed-cotizacion-ejemplo.js. Puedes editar, publicar versiones o eliminar.'
    },
    actividades: {
      tipo_estructura: 'analitica',
      bloques,
      perfiles
    },
    costos: {
      recursos,
      parametros: {
        ...base.costos.parametros,
        moneda: 'PEN',
        moneda_recursos: 'PEN',
        moneda_proyeccion: 'USD',
        tipo_cambio: 3.75,
        horas_mes: 160,
        igv_pct: 18,
        comision_admin_pct: 10,
        horas_garantia: 16,
        recurso_garantia_idx: 0,
        markups: [1.9, 1.65, 1.75, 1.45],
        proyeccion_activa: 1,
        terminos_pago: '30 días calendario desde emisión de factura.',
        notas_costos: 'Costos en soles; proyección comercial en USD (tipo de cambio referencial).'
      }
    },
    propuesta
  });
}

async function main() {
  const responsables = await Cotizacion.listarResponsables();
  const responsableId = responsables[0]?.id;
  if (!responsableId) {
    throw new Error('No hay responsables de cotización en BD. Verifica empleados con emails del catálogo.');
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones'
  });

  const [prev] = await conn.query(`SELECT id FROM cotizaciones WHERE codigo = ?`, [CODIGO_DEMO]);
  if (prev.length) {
    await conn.query(`DELETE FROM cotizacion_versiones WHERE cotizacion_id = ?`, [prev[0].id]);
    await conn.query(`DELETE FROM cotizaciones WHERE id = ?`, [prev[0].id]);
    console.log(`Eliminada cotización demo anterior (id ${prev[0].id})`);
  }
  await conn.end();

  const borrador = buildBorradorEjemplo(responsableId);

  const detalle = await Cotizacion.crear(responsableId, {
    general: borrador.general
  });

  const id = detalle.cotizacion.id;
  const completo = await Cotizacion.actualizarBorrador(id, {
    general: borrador.general,
    actividades: borrador.actividades,
    costos: borrador.costos,
    propuesta: borrador.propuesta
  });

  const c = completo.cotizacion;
  console.log('');
  console.log('Cotización demo creada:');
  console.log(`  Código:     ${c.codigo}`);
  console.log(`  ID:         ${c.id}`);
  console.log(`  Proyecto:   ${c.proyecto}`);
  console.log(`  Cliente:    ${c.cliente}`);
  console.log(`  Tipo:       ${c.tipo_proyecto}`);
  console.log(`  Versión:    ${c.version_actual}`);
  console.log(`  Responsable: ${completo.cotizacion.responsable_nombre || responsableId}`);
  console.log('');
  console.log('Abre Cotizaciones en el portal y selecciona', CODIGO_DEMO);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
