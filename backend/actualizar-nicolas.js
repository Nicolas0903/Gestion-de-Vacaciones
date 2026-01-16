// Script para actualizar Nicolas Valdivia - Operaciones (datos reales)
require('dotenv').config();
const mysql = require('mysql2/promise');

async function actualizarNicolas() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Actualizando Nicolas Valdivia - Operaciones (datos reales)...\n');

    // ====================================
    // 1. ACTUALIZAR DATOS DE NICOLAS
    // ====================================
    console.log('👤 Actualizando datos de Nicolas Valdivia...');

    // Buscar ID de Enrique como jefe
    const [enriqueResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['enrique.agapito@prayaga.biz']
    );
    const enriqueId = enriqueResult.length > 0 ? enriqueResult[0].id : null;

    // Actualizar Nicolas - asignar a Enrique como jefe
    await pool.execute(
      `UPDATE empleados 
       SET cargo = 'Operaciones', jefe_id = ?
       WHERE email = ?`,
      [enriqueId, 'nicolas.valdivia@prayaga.biz']
    );

    // Obtener ID de Nicolas
    const [nicolasResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['nicolas.valdivia@prayaga.biz']
    );
    
    if (nicolasResult.length === 0) {
      console.error('❌ Nicolas Valdivia no existe en la base de datos');
      process.exit(1);
    }

    const nicolasId = nicolasResult[0].id;
    console.log(`   ✓ Nicolas actualizado con ID: ${nicolasId}\n`);

    // LIMPIAR DATOS ANTERIORES
    console.log('🧹 Limpiando datos anteriores...');
    // Primero obtener IDs de solicitudes
    const [solicitudesResult] = await pool.execute(
      'SELECT id FROM solicitudes_vacaciones WHERE empleado_id = ?',
      [nicolasId]
    );
    
    // Borrar aprobaciones asociadas a estas solicitudes
    for (const sol of solicitudesResult) {
      await pool.execute('DELETE FROM aprobaciones WHERE solicitud_id = ?', [sol.id]);
    }
    
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [nicolasId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [nicolasId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [nicolasId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS
    // ====================================
    console.log('📅 Creando PERIODO GANADO...');

    const [result] = await pool.execute(
      `INSERT INTO periodos_vacaciones 
       (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
        dias_gozados, tiempo_trabajado, estado, observaciones)
       VALUES (?, ?, ?, ?, 0, '12 meses', 'pendiente', ?)`,
      [nicolasId, '2024-05-02', '2025-05-01', 15, 'Regimen PYME (15 dias de Vacaciones)']
    );
    
    const periodoId = result.insertId;
    console.log(`   ✓ Periodo 2024-2025: 15 días`);

    // ====================================
    // 3. SALIDAS GOZADAS (2 SALIDAS = 5 DIAS)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (2 salidas = 5 días)...');

    const salidas = [
      { salida: '2025-08-11', retorno: '2025-08-15', dias: 4, obs: 'Se envió correo con formato' },
      { salida: '2025-12-26', retorno: '2025-12-29', dias: 1, obs: 'Periodo 2024-2025 - comunic.MS telef. 22 dic' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [nicolasId, periodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nicolasId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.dias} días - ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS
    // ====================================
    console.log('\n📊 Actualizando días gozados...');
    
    await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = 5, estado = 'parcial'
       WHERE id = ?`,
      [periodoId]
    );
    console.log(`   ✓ Periodo 2024-2025: 5 días gozados, 10 pendientes (parcial)`);

    // ====================================
    // RESUMEN FINAL
    // ====================================
    const totalGanados = 15; // Solo el período 2024-2025
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ NICOLAS VALDIVIA ACTUALIZADO EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: nicolas.valdivia@prayaga.biz');
    console.log('🔑 Contraseña: (sin cambios)');
    console.log('👔 Cargo: Operaciones');
    console.log(`📊 Jefe directo: ${enriqueId ? 'Enrique Agapito (Jefe de Operaciones)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS (período 2024-2025): ${totalGanados} días`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (2 salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

actualizarNicolas();
