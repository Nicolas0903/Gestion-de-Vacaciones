// Script para redistribuir las solicitudes de vacaciones a sus períodos correctos
// basándose en las observaciones que indican "Periodo YYYY-YYYY"

require('dotenv').config();
const mysql = require('mysql2/promise');

async function redistribuirPeriodos() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('🔄 Iniciando redistribución de solicitudes a períodos correctos...\n');

    // 1. Obtener todas las solicitudes aprobadas con sus observaciones
    const [solicitudes] = await pool.execute(`
      SELECT sv.id, sv.empleado_id, sv.periodo_id, sv.observaciones, sv.dias_solicitados,
             sv.fecha_inicio_vacaciones, sv.fecha_fin_vacaciones,
             e.nombres, e.apellidos,
             pv.fecha_inicio_periodo as periodo_actual_inicio
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON sv.empleado_id = e.id
      JOIN periodos_vacaciones pv ON sv.periodo_id = pv.id
      WHERE sv.estado = 'aprobada'
      ORDER BY sv.empleado_id, sv.fecha_inicio_vacaciones
    `);

    console.log(`📋 Encontradas ${solicitudes.length} solicitudes aprobadas\n`);

    let actualizadas = 0;
    let errores = 0;
    const cambiosPorEmpleado = {};

    for (const solicitud of solicitudes) {
      const obs = solicitud.observaciones || '';
      
      // Buscar patrón "Periodo YYYY-YYYY" en las observaciones
      const match = obs.match(/Periodo\s+(\d{4})-(\d{4})/i);
      
      if (!match) {
        console.log(`⚠️  Solicitud #${solicitud.id} (${solicitud.nombres} ${solicitud.apellidos}): Sin período en observaciones`);
        console.log(`    Obs: "${obs}"`);
        continue;
      }

      const anioInicioPeriodo = parseInt(match[1]);
      const anioFinPeriodo = parseInt(match[2]);
      
      // Buscar el período correcto del empleado
      const [periodos] = await pool.execute(`
        SELECT id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados
        FROM periodos_vacaciones
        WHERE empleado_id = ?
          AND YEAR(fecha_inicio_periodo) = ?
        ORDER BY fecha_inicio_periodo
        LIMIT 1
      `, [solicitud.empleado_id, anioInicioPeriodo]);

      if (periodos.length === 0) {
        console.log(`❌ Solicitud #${solicitud.id}: No se encontró período ${anioInicioPeriodo}-${anioFinPeriodo} para ${solicitud.nombres}`);
        errores++;
        continue;
      }

      const periodoCorresto = periodos[0];

      // Si ya está en el período correcto, saltar
      if (solicitud.periodo_id === periodoCorresto.id) {
        continue;
      }

      // Actualizar el periodo_id de la solicitud
      await pool.execute(
        'UPDATE solicitudes_vacaciones SET periodo_id = ? WHERE id = ?',
        [periodoCorresto.id, solicitud.id]
      );

      // También actualizar historial_vacaciones si existe
      await pool.execute(
        'UPDATE historial_vacaciones SET periodo_aplicado = ? WHERE solicitud_id = ?',
        [`${anioInicioPeriodo}-${anioFinPeriodo}`, solicitud.id]
      );

      const key = `${solicitud.nombres} ${solicitud.apellidos}`;
      if (!cambiosPorEmpleado[key]) {
        cambiosPorEmpleado[key] = [];
      }
      cambiosPorEmpleado[key].push({
        solicitud_id: solicitud.id,
        dias: solicitud.dias_solicitados,
        fecha: solicitud.fecha_inicio_vacaciones,
        de_periodo: solicitud.periodo_actual_inicio,
        a_periodo: periodoCorresto.fecha_inicio_periodo
      });

      actualizadas++;
    }

    console.log('\n📊 Cambios realizados por empleado:');
    console.log('='.repeat(60));
    
    for (const [empleado, cambios] of Object.entries(cambiosPorEmpleado)) {
      console.log(`\n👤 ${empleado}:`);
      for (const c of cambios) {
        console.log(`   Solicitud #${c.solicitud_id}: ${c.dias} días (${c.fecha})`);
        console.log(`   ${c.de_periodo} → ${c.a_periodo}`);
      }
    }

    // 2. Recalcular días gozados de cada período
    console.log('\n\n🔄 Recalculando días gozados de cada período...\n');

    const [todosLosPeriodos] = await pool.execute(`
      SELECT pv.id, pv.empleado_id, pv.fecha_inicio_periodo, pv.dias_correspondientes,
             e.nombres, e.apellidos
      FROM periodos_vacaciones pv
      JOIN empleados e ON pv.empleado_id = e.id
      ORDER BY pv.empleado_id, pv.fecha_inicio_periodo
    `);

    for (const periodo of todosLosPeriodos) {
      // Calcular total de días de solicitudes aprobadas para este período
      const [resultado] = await pool.execute(`
        SELECT COALESCE(SUM(dias_solicitados), 0) as total_gozados
        FROM solicitudes_vacaciones
        WHERE periodo_id = ? AND estado = 'aprobada'
      `, [periodo.id]);

      const diasGozados = resultado[0].total_gozados;

      // Determinar estado
      let estado = 'pendiente';
      if (diasGozados >= periodo.dias_correspondientes) {
        estado = 'gozadas';
      } else if (diasGozados > 0) {
        estado = 'parcial';
      }

      // Actualizar el período
      await pool.execute(
        'UPDATE periodos_vacaciones SET dias_gozados = ?, estado = ? WHERE id = ?',
        [diasGozados, estado, periodo.id]
      );
    }

    console.log('✅ Días gozados recalculados para todos los períodos\n');

    // 3. Mostrar resumen final por empleado
    console.log('\n📈 RESUMEN FINAL POR EMPLEADO:');
    console.log('='.repeat(80));

    const [empleados] = await pool.execute(`
      SELECT DISTINCT e.id, e.nombres, e.apellidos
      FROM empleados e
      JOIN periodos_vacaciones pv ON e.id = pv.empleado_id
      WHERE e.activo = TRUE
      ORDER BY e.apellidos, e.nombres
    `);

    for (const emp of empleados) {
      const [periodos] = await pool.execute(`
        SELECT fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados, dias_pendientes, estado
        FROM periodos_vacaciones
        WHERE empleado_id = ?
        ORDER BY fecha_inicio_periodo
      `, [emp.id]);

      if (periodos.length === 0) continue;

      console.log(`\n👤 ${emp.nombres} ${emp.apellidos}:`);
      
      let totalGanados = 0, totalGozados = 0, totalPendientes = 0;
      
      for (const p of periodos) {
        const inicio = new Date(p.fecha_inicio_periodo).toLocaleDateString('es-PE');
        const fin = new Date(p.fecha_fin_periodo).toLocaleDateString('es-PE');
        console.log(`   ${inicio} - ${fin}: ${p.dias_correspondientes} ganados, ${p.dias_gozados} gozados, ${p.dias_pendientes} pendientes (${p.estado})`);
        totalGanados += p.dias_correspondientes;
        totalGozados += p.dias_gozados;
        totalPendientes += p.dias_pendientes;
      }
      console.log(`   TOTAL: ${totalGanados} ganados, ${totalGozados} gozados, ${totalPendientes} pendientes`);
    }

    console.log('\n\n' + '='.repeat(80));
    console.log(`✅ REDISTRIBUCIÓN COMPLETADA`);
    console.log(`   Solicitudes actualizadas: ${actualizadas}`);
    console.log(`   Errores: ${errores}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

redistribuirPeriodos();
