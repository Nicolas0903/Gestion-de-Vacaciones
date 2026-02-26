// Script para corregir los días de vacaciones de Veronica Gonzales
// Total según Excel: 90 ganados, 81 gozados, 9 pendientes

require('dotenv').config();
const mysql = require('mysql2/promise');

async function corregirVeronica() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('🔄 Corrigiendo datos de Veronica Gonzales...\n');

    // Obtener ID de Veronica
    const [veronicaResult] = await pool.execute(
      "SELECT id FROM empleados WHERE nombres LIKE '%Veronica%'"
    );
    
    if (veronicaResult.length === 0) {
      console.error('❌ No se encontró a Veronica');
      return;
    }
    const veronicaId = veronicaResult[0].id;
    console.log(`✅ Veronica ID: ${veronicaId}`);

    // Obtener ID de Rocio (quien sube los registros)
    const [rocioResult] = await pool.execute(
      "SELECT id FROM empleados WHERE email = 'rocio.picon@prayaga.biz'"
    );
    const aprobadorId = rocioResult.length > 0 ? rocioResult[0].id : veronicaId;

    // Obtener períodos actuales
    const [periodos] = await pool.execute(`
      SELECT id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados
      FROM periodos_vacaciones
      WHERE empleado_id = ?
      ORDER BY fecha_inicio_periodo
    `, [veronicaId]);

    console.log('\n📅 Períodos actuales:');
    for (const p of periodos) {
      console.log(`   ${p.fecha_inicio_periodo} - ${p.fecha_fin_periodo}: ${p.dias_correspondientes} ganados, ${p.dias_gozados} gozados`);
    }

    // Distribución objetivo según Excel (FIFO):
    // 2021-2022: 15 días (completo)
    // 2022-2023: 15 días (completo)  
    // 2023-2024: 30 días (completo)
    // 2024-2025: 21 días (parcial, 9 pendientes)
    // Total: 81 gozados

    const distribucionObjetivo = {
      '2021': 15,  // Período 2021-2022
      '2022': 15,  // Período 2022-2023
      '2023': 30,  // Período 2023-2024
      '2024': 21   // Período 2024-2025 (30 - 9 pendientes = 21)
    };

    console.log('\n🎯 Distribución objetivo:');
    console.log('   2021-2022: 15 días (completo)');
    console.log('   2022-2023: 15 días (completo)');
    console.log('   2023-2024: 30 días (completo)');
    console.log('   2024-2025: 21 días (9 pendientes)');
    console.log('   Total: 81 gozados, 9 pendientes\n');

    // Calcular días faltantes por período
    for (const p of periodos) {
      const anioInicio = new Date(p.fecha_inicio_periodo).getFullYear().toString();
      const objetivo = distribucionObjetivo[anioInicio] || 0;
      const faltante = objetivo - p.dias_gozados;

      if (faltante > 0) {
        console.log(`📝 Período ${anioInicio}: Faltan ${faltante} días (tiene ${p.dias_gozados}, objetivo ${objetivo})`);
        
        // Crear solicitud histórica para completar
        const fechaHistorica = new Date(p.fecha_inicio_periodo);
        fechaHistorica.setMonth(fechaHistorica.getMonth() + 6); // Mitad del período
        
        const fechaInicio = fechaHistorica.toISOString().split('T')[0];
        const fechaFin = new Date(fechaHistorica);
        fechaFin.setDate(fechaFin.getDate() + faltante - 1);
        const fechaFinStr = fechaFin.toISOString().split('T')[0];

        // Insertar solicitud histórica
        const [result] = await pool.execute(`
          INSERT INTO solicitudes_vacaciones (
            empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones,
            dias_solicitados, fecha_efectiva_salida, fecha_efectiva_regreso,
            observaciones, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aprobada')
        `, [
          veronicaId,
          p.id,
          fechaInicio,
          fechaFinStr,
          faltante,
          fechaInicio,
          fechaFinStr,
          `Vacaciones históricas - Período ${anioInicio}-${parseInt(anioInicio)+1} (registros anteriores al sistema)`
        ]);

        console.log(`   ✅ Solicitud histórica creada: ${faltante} días`);

        // Crear registro de aprobación
        await pool.execute(`
          INSERT INTO aprobaciones (solicitud_id, aprobador_id, tipo_aprobacion, estado, comentarios)
          VALUES (?, ?, 'contadora', 'aprobada', 'Registro histórico')
        `, [result.insertId, aprobadorId]);
      }
    }

    // Corregir solicitud #107 (1 día debería ser 3 días: 26-29 dic)
    console.log('\n🔧 Corrigiendo solicitud #107 (26-29 dic = 3 días, no 1)...');
    await pool.execute(`
      UPDATE solicitudes_vacaciones 
      SET dias_solicitados = 3, fecha_fin_vacaciones = '2025-12-29'
      WHERE id = 107
    `);
    console.log('   ✅ Solicitud #107 corregida');

    // Recalcular días gozados de cada período
    console.log('\n🔄 Recalculando días gozados...');
    
    for (const p of periodos) {
      const [resultado] = await pool.execute(`
        SELECT COALESCE(SUM(dias_solicitados), 0) as total
        FROM solicitudes_vacaciones
        WHERE periodo_id = ? AND estado = 'aprobada'
      `, [p.id]);

      const diasGozados = resultado[0].total;
      
      let estado = 'pendiente';
      if (diasGozados >= p.dias_correspondientes) {
        estado = 'gozadas';
      } else if (diasGozados > 0) {
        estado = 'parcial';
      }

      await pool.execute(`
        UPDATE periodos_vacaciones 
        SET dias_gozados = ?, estado = ?
        WHERE id = ?
      `, [diasGozados, estado, p.id]);
    }

    // Mostrar resultado final
    const [periodosFinales] = await pool.execute(`
      SELECT fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados, dias_pendientes, estado
      FROM periodos_vacaciones
      WHERE empleado_id = ?
      ORDER BY fecha_inicio_periodo
    `, [veronicaId]);

    console.log('\n📊 RESULTADO FINAL - VERONICA GONZALES:');
    console.log('='.repeat(60));
    
    let totalGanados = 0, totalGozados = 0, totalPendientes = 0;
    for (const p of periodosFinales) {
      const inicio = new Date(p.fecha_inicio_periodo).toLocaleDateString('es-PE');
      const fin = new Date(p.fecha_fin_periodo).toLocaleDateString('es-PE');
      console.log(`   ${inicio} - ${fin}: ${p.dias_correspondientes} ganados, ${p.dias_gozados} gozados, ${p.dias_pendientes} pendientes (${p.estado})`);
      totalGanados += p.dias_correspondientes;
      totalGozados += p.dias_gozados;
      totalPendientes += p.dias_pendientes;
    }
    console.log('='.repeat(60));
    console.log(`   TOTAL: ${totalGanados} ganados, ${totalGozados} gozados, ${totalPendientes} pendientes`);
    console.log('\n✅ Corrección completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

corregirVeronica();
