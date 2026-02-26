/**
 * Script para corregir los datos de Magali según el Excel oficial.
 * 
 * Excel: 450 ganadas, 220 gozadas, 230 pendientes
 * Sistema actual: 450 total, 213 gozadas, 237 pendientes
 * Diferencia: 7 días faltantes en gozados
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function corregirMagali() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🔍 Buscando datos de Magali Sevillano...\n');

    const [magali] = await pool.execute(
      "SELECT id FROM empleados WHERE email = 'magali.sevillano@prayaga.biz'"
    );

    if (magali.length === 0) {
      console.error('❌ No se encontró a Magali Sevillano');
      process.exit(1);
    }

    const magaliId = magali[0].id;

    // Estado actual
    const [periodos] = await pool.execute(
      `SELECT id, fecha_inicio_periodo, observaciones, dias_correspondientes, dias_gozados, estado
       FROM periodos_vacaciones 
       WHERE empleado_id = ?
       ORDER BY fecha_inicio_periodo ASC`,
      [magaliId]
    );

    const totalActual = periodos.reduce((s, p) => s + p.dias_gozados, 0);
    const objetivoExcel = 220;
    const diferencia = objetivoExcel - totalActual;

    console.log(`   Total gozados actual: ${totalActual}`);
    console.log(`   Total según Excel: ${objetivoExcel}`);
    console.log(`   Diferencia: ${diferencia} días\n`);

    if (diferencia === 0) {
      console.log('✅ Los datos ya cuadran con el Excel.');
      await pool.end();
      return;
    }

    if (diferencia < 0) {
      console.error('❌ El sistema tiene MÁS días gozados que el Excel. Revisar manualmente.');
      await pool.end();
      process.exit(1);
    }

    // Según Excel: 7 períodos gozadas (2010-2017) + parcial 2017-2018 con 9 días
    // El periodo 2017-2018 en Excel tiene 9 días (8+1 de las observaciones)
    // Sumamos los 7 días faltantes al periodo 2017-2018
    const periodo2017 = periodos.find(p => p.observaciones && p.observaciones.includes('2017-2018'));
    
    if (!periodo2017) {
      console.error('❌ No se encontró el periodo 2017-2018');
      process.exit(1);
    }

    const nuevosGozados = periodo2017.dias_gozados + diferencia;
    
    if (nuevosGozados > periodo2017.dias_correspondientes) {
      console.error('❌ Los días a agregar exceden el periodo. Revisar.');
      process.exit(1);
    }

    const nuevoEstado = nuevosGozados === periodo2017.dias_correspondientes ? 'gozadas' : 'parcial';

    await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = ?, estado = ?
       WHERE id = ?`,
      [nuevosGozados, nuevoEstado, periodo2017.id]
    );

    console.log(`✅ Actualizado periodo 2017-2018: ${periodo2017.dias_gozados} → ${nuevosGozados} días gozados\n`);

    // Verificar resultado
    const [verificacion] = await pool.execute(
      `SELECT 
         SUM(dias_correspondientes) as total,
         SUM(dias_gozados) as gozados
       FROM periodos_vacaciones
       WHERE empleado_id = ?`,
      [magaliId]
    );

    const total = verificacion[0].total;
    const gozados = verificacion[0].gozados;
    const pendientes = total - gozados;

    console.log('========================================');
    console.log('✅ MAGALI - DATOS CORREGIDOS');
    console.log('========================================');
    console.log(`   Total ganadas: ${total}`);
    console.log(`   Gozadas: ${gozados} (objetivo Excel: 220)`);
    console.log(`   Pendientes: ${pendientes} (objetivo Excel: 230)`);
    console.log('========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

corregirMagali();
