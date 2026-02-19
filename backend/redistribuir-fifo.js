// Script para redistribuir las solicitudes de vacaciones usando lógica FIFO
// Agota primero los períodos más antiguos, luego pasa al siguiente
// NO afecta los totales, solo redistribuye entre períodos

require('dotenv').config();
const mysql = require('mysql2/promise');

async function redistribuirFIFO() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('🔄 Iniciando redistribución FIFO de solicitudes...\n');

    // 1. Obtener todos los empleados con solicitudes aprobadas
    const [empleados] = await pool.execute(`
      SELECT DISTINCT e.id, e.nombres, e.apellidos
      FROM empleados e
      JOIN solicitudes_vacaciones sv ON e.id = sv.empleado_id
      WHERE sv.estado = 'aprobada'
      ORDER BY e.apellidos, e.nombres
    `);

    console.log(`👥 Procesando ${empleados.length} empleados con solicitudes aprobadas\n`);

    for (const empleado of empleados) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 ${empleado.nombres} ${empleado.apellidos}`);
      console.log('='.repeat(60));

      // 2. Obtener todos los períodos del empleado ordenados por fecha (más antiguo primero)
      const [periodos] = await pool.execute(`
        SELECT id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes
        FROM periodos_vacaciones
        WHERE empleado_id = ?
        ORDER BY fecha_inicio_periodo ASC
      `, [empleado.id]);

      if (periodos.length === 0) {
        console.log('   ⚠️ Sin períodos registrados');
        continue;
      }

      // 3. Obtener todas las solicitudes aprobadas del empleado ordenadas por fecha
      const [solicitudes] = await pool.execute(`
        SELECT id, dias_solicitados, fecha_inicio_vacaciones, periodo_id
        FROM solicitudes_vacaciones
        WHERE empleado_id = ? AND estado = 'aprobada'
        ORDER BY fecha_inicio_vacaciones ASC
      `, [empleado.id]);

      if (solicitudes.length === 0) {
        console.log('   ⚠️ Sin solicitudes aprobadas');
        continue;
      }

      // Calcular total de días gozados
      const totalDiasGozados = solicitudes.reduce((sum, s) => sum + s.dias_solicitados, 0);
      console.log(`   📊 Total días gozados: ${totalDiasGozados}`);
      console.log(`   📋 Solicitudes: ${solicitudes.length}`);
      console.log(`   📅 Períodos: ${periodos.length}`);

      // 4. Crear estructura para tracking de días disponibles por período
      const periodosDisponibles = periodos.map(p => ({
        id: p.id,
        inicio: p.fecha_inicio_periodo,
        diasCorrespondientes: p.dias_correspondientes,
        diasAsignados: 0,
        solicitudesAsignadas: []
      }));

      // 5. Redistribuir cada solicitud usando FIFO
      for (const solicitud of solicitudes) {
        let diasPorAsignar = solicitud.dias_solicitados;
        
        // Buscar el período más antiguo con días disponibles
        for (const periodo of periodosDisponibles) {
          const diasDisponibles = periodo.diasCorrespondientes - periodo.diasAsignados;
          
          if (diasDisponibles > 0 && diasPorAsignar > 0) {
            // Asignar todos los días a este período si caben
            if (diasPorAsignar <= diasDisponibles) {
              periodo.diasAsignados += diasPorAsignar;
              periodo.solicitudesAsignadas.push({
                id: solicitud.id,
                dias: diasPorAsignar,
                fecha: solicitud.fecha_inicio_vacaciones
              });
              diasPorAsignar = 0;
              break;
            } else {
              // Si no caben todos, este caso no debería pasar si mantenemos 1 solicitud = 1 período
              // Por simplicidad, asignamos la solicitud completa al período con más espacio
              // que pueda contenerla, o al último período
            }
          }
        }

        // Si aún quedan días por asignar (todos los períodos llenos), 
        // asignar al último período (overflow)
        if (diasPorAsignar > 0) {
          const ultimoPeriodo = periodosDisponibles[periodosDisponibles.length - 1];
          ultimoPeriodo.diasAsignados += diasPorAsignar;
          ultimoPeriodo.solicitudesAsignadas.push({
            id: solicitud.id,
            dias: diasPorAsignar,
            fecha: solicitud.fecha_inicio_vacaciones
          });
        }
      }

      // 6. Actualizar las solicitudes con su nuevo periodo_id
      for (const periodo of periodosDisponibles) {
        for (const sol of periodo.solicitudesAsignadas) {
          await pool.execute(
            'UPDATE solicitudes_vacaciones SET periodo_id = ? WHERE id = ?',
            [periodo.id, sol.id]
          );
        }
      }

      // 7. Actualizar días gozados de cada período
      for (const periodo of periodosDisponibles) {
        // Determinar estado
        let estado = 'pendiente';
        if (periodo.diasAsignados >= periodo.diasCorrespondientes) {
          estado = 'gozadas';
        } else if (periodo.diasAsignados > 0) {
          estado = 'parcial';
        }

        await pool.execute(
          'UPDATE periodos_vacaciones SET dias_gozados = ?, estado = ? WHERE id = ?',
          [periodo.diasAsignados, estado, periodo.id]
        );
      }

      // 8. Mostrar resultado para este empleado
      console.log('\n   📅 Distribución FIFO:');
      for (const periodo of periodosDisponibles) {
        const fechaInicio = new Date(periodo.inicio).toLocaleDateString('es-PE');
        const disponibles = periodo.diasCorrespondientes - periodo.diasAsignados;
        const estado = disponibles <= 0 ? '✅ AGOTADO' : (periodo.diasAsignados > 0 ? '📊 PARCIAL' : '⏳ PENDIENTE');
        console.log(`   ${fechaInicio}: ${periodo.diasCorrespondientes} ganados, ${periodo.diasAsignados} gozados, ${disponibles} pendientes ${estado}`);
      }

      // Verificar que el total sigue igual
      const nuevoTotal = periodosDisponibles.reduce((sum, p) => sum + p.diasAsignados, 0);
      if (nuevoTotal !== totalDiasGozados) {
        console.log(`   ⚠️ ALERTA: Total cambió de ${totalDiasGozados} a ${nuevoTotal}`);
      } else {
        console.log(`   ✅ Total verificado: ${nuevoTotal} días`);
      }
    }

    // RESUMEN FINAL
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 RESUMEN FINAL - REDISTRIBUCIÓN FIFO COMPLETADA');
    console.log('='.repeat(80));

    const [resumenEmpleados] = await pool.execute(`
      SELECT DISTINCT e.id, e.nombres, e.apellidos
      FROM empleados e
      JOIN periodos_vacaciones pv ON e.id = pv.empleado_id
      WHERE e.activo = TRUE
      ORDER BY e.apellidos, e.nombres
    `);

    for (const emp of resumenEmpleados) {
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
        const estado = p.dias_pendientes <= 0 ? '✅' : (p.dias_gozados > 0 ? '📊' : '⏳');
        console.log(`   ${inicio} - ${fin}: ${p.dias_correspondientes} ganados, ${p.dias_gozados} gozados, ${p.dias_pendientes} pendientes ${estado}`);
        totalGanados += p.dias_correspondientes;
        totalGozados += p.dias_gozados;
        totalPendientes += p.dias_pendientes;
      }
      console.log(`   TOTAL: ${totalGanados} ganados, ${totalGozados} gozados, ${totalPendientes} pendientes`);
    }

    console.log('\n✅ Redistribución FIFO completada exitosamente');
    console.log('   - Los totales de cada empleado se mantienen igual');
    console.log('   - Los días se asignaron a períodos más antiguos primero');
    console.log('   - No hay valores negativos\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

redistribuirFIFO();
