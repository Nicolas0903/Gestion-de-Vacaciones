// Script para crear Oscar Llanca - Consultor
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearOscar() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Oscar Llanca - Consultor...\n');

    // ====================================
    // 1. CREAR OSCAR LLANCA
    // ====================================
    console.log('👤 Creando empleado Oscar Llanca...');
    
    const password = await bcrypt.hash('Oscar2024', 10);
    
    // Buscar ID del rol consultor
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['consultor']
    );
    const rolConsultorId = rolesResult[0].id;

    // Buscar ID de Ricardo Martinez como jefe
    const [ricardoResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['ricardo.martinez@prayaga.biz']
    );
    const ricardoId = ricardoResult.length > 0 ? ricardoResult[0].id : null;

    // Crear o actualizar Oscar
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['CONS002', 'Oscar', 'Llanca', '12345684', 'oscar.llanca@prayaga.biz', 
       password, 'Consultor', '2022-09-01', rolConsultorId, ricardoId]
    );

    // Obtener ID de Oscar
    const [oscarResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['oscar.llanca@prayaga.biz']
    );
    const oscarId = oscarResult[0].id;
    console.log(`   ✓ Oscar creado con ID: ${oscarId}\n`);

    // LIMPIAR DATOS ANTERIORES SI EXISTEN
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [oscarId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [oscarId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [oscarId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - 3 PERIODOS = 45 DIAS)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1 - 3 períodos = 45 días)...');

    const periodosGanados = [
      { inicio: '2022-09-01', fin: '2023-08-31', dias: 15, periodo: '2022-2023', obs: 'Regimen PYME (15 dias de Vacaciones) - Gozado' },
      { inicio: '2023-09-01', fin: '2024-08-31', dias: 15, periodo: '2023-2024', obs: 'Regimen PYME (15 dias de Vacaciones) - Gozado' },
      { inicio: '2024-09-01', fin: '2025-08-31', dias: 15, periodo: '2024-2025', obs: 'Regimen PYME (15 dias de Vacaciones)' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const estado = p.obs.includes('Gozado') ? 'gozadas' : 'pendiente';
      
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
        [oscarId, p.inicio, p.fin, p.dias, estado, p.obs]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días - ${p.obs}`);
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2 - 3 SALIDAS)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2 - 3 salidas)...');

    const salidas = [
      { salida: '2023-06-30', retorno: '2023-07-01', dias: 1, obs: 'Se envió correo con formato 30/06/23 - Periodo 2022-2023' },
      { salida: '2023-07-17', retorno: '2023-07-31', dias: 14, obs: 'Se envió correo con formato 10/07/23 - Periodo 2022-2023' },
      { salida: '2025-09-18', retorno: '2025-10-03', dias: 15, obs: 'Se envió correo con formato 02/09/25 - Periodo 2024-2025' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [oscarId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [oscarId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.dias} días - ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2022-2023', dias: 15, estado: 'gozadas' },
      { periodo: '2023-2024', dias: 0, estado: 'pendiente' },
      { periodo: '2024-2025', dias: 15, estado: 'gozadas' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, oscarId, `%${p.periodo}%`]
      );
      
      const pendiente = 15 - p.dias;
      if (p.dias > 0) {
        console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días gozados, ${pendiente} pendientes (${p.estado})`);
      }
    }

    // ====================================
    // RESUMEN FINAL
    // ====================================
    const [resumen] = await pool.execute(
      `SELECT 
         SUM(dias_correspondientes) as total_ganados
       FROM periodos_vacaciones
       WHERE empleado_id = ?`,
      [oscarId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ OSCAR LLANCA CREADO EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: oscar.llanca@prayaga.biz');
    console.log('🔑 Contraseña: Oscar2024');
    console.log('👔 Cargo: Consultor');
    console.log(`📊 Jefe directo: ${ricardoId ? 'Ricardo Martinez (Gerente de Consultoría)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (3 períodos)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n📝 NOTA: Régimen PYME (15 días por período)');
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearOscar();
