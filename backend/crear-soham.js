// Script para crear Soham Carbajal - Marketing
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearSoham() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Soham Carbajal - Marketing...\n');

    // ====================================
    // 1. CREAR SOHAM CARBAJAL
    // ====================================
    console.log('👤 Creando empleado Soham Carbajal...');
    
    const password = await bcrypt.hash('Soham2024', 10);
    
    // Buscar ID del rol empleado
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['empleado']
    );
    const rolEmpleadoId = rolesResult[0].id;

    // Buscar ID de Stephanie como jefa
    const [stephanieResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['stephanie.agapito@prayaga.biz']
    );
    const stephanieId = stephanieResult.length > 0 ? stephanieResult[0].id : null;

    // Crear o actualizar Soham
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['MKT002', 'Soham', 'Carbajal', '12345685', 'soham.carbajal@prayaga.biz', 
       password, 'Marketing', '2024-05-02', rolEmpleadoId, stephanieId]
    );

    // Obtener ID de Soham
    const [sohamResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['soham.carbajal@prayaga.biz']
    );
    const sohamId = sohamResult[0].id;
    console.log(`   ✓ Soham creado con ID: ${sohamId}\n`);

    // LIMPIAR DATOS ANTERIORES
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [sohamId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [sohamId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [sohamId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS...');

    const periodosGanados = [
      { inicio: '2024-05-02', fin: '2025-05-01', dias: 15, periodo: '2024-2025', obs: 'Regimen PYME (15 dias de Vacaciones)' },
      { inicio: '2025-05-02', fin: '2026-05-01', dias: 15, periodo: '2025-2026', obs: 'Regimen PYME (15 dias de Vacaciones)' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', 'pendiente', ?)`,
        [sohamId, p.inicio, p.fin, p.dias, p.obs]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días`);
    }

    // ====================================
    // 3. SALIDAS GOZADAS (4 SALIDAS = 16 DIAS)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (4 salidas = 16 días)...');

    const salidas = [
      { salida: '2025-06-25', retorno: '2025-07-01', dias: 6, obs: 'Se envió correo con formato 25/06/2025' },
      { salida: '2025-08-25', retorno: '2025-09-01', dias: 7, obs: 'Se envió correo con formato 20/08/2025' },
      { salida: '2025-10-29', retorno: '2025-10-31', dias: 2, obs: 'Se envió correo con formato 27/10/2025' },
      { salida: '2025-12-26', retorno: '2025-12-29', dias: 1, obs: 'Periodo 2025-2026 - comunic.MS telef. 22 dic' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [sohamId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sohamId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.dias} días - ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    
    // Periodo 2024-2025: 15 días gozados
    await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = 15, estado = 'gozadas'
       WHERE empleado_id = ? AND observaciones LIKE '%2024-2025%'`,
      [sohamId]
    );
    console.log(`   ✓ Periodo 2024-2025: 15 días gozados, 0 pendientes (gozadas)`);
    
    // Periodo 2025-2026: 1 día gozado (adelantado)
    await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = 1, estado = 'parcial'
       WHERE empleado_id = ? AND observaciones LIKE '%2025-2026%'`,
      [sohamId]
    );
    console.log(`   ✓ Periodo 2025-2026: 1 día gozado (adelantado), 14 pendientes (parcial)`);

    // ====================================
    // RESUMEN FINAL
    // ====================================
    const totalGanados = 15; // Solo el período actual
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ SOHAM CARBAJAL CREADO EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: soham.carbajal@prayaga.biz');
    console.log('🔑 Contraseña: Soham2024');
    console.log('👔 Cargo: Marketing');
    console.log(`📊 Jefa directa: ${stephanieId ? 'Stephanie Agapito (Encargada de Marketing)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS (período actual): ${totalGanados} días`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (4 salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n⚠️  NOTA: Adelantó 1 día del período 2025-2026');
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearSoham();
