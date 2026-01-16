// Script para crear Veronica Gonzales - Contrato Temporal
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearVeronica() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Veronica Gonzales - Contrato Temporal...\n');

    // ====================================
    // 1. CREAR VERONICA GONZALES
    // ====================================
    console.log('👤 Creando empleada Veronica Gonzales...');
    
    const password = await bcrypt.hash('Veronica2024', 10);
    
    // Buscar ID del rol empleado
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['empleado']
    );
    const rolEmpleadoId = rolesResult[0].id;

    // Buscar ID de Rocío (contadora) como jefa
    const [rocioResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['rocio.picon@prayaga.biz']
    );
    const rocioId = rocioResult.length > 0 ? rocioResult[0].id : null;

    // Crear o actualizar Veronica
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['TEMP001', 'Veronica', 'Gonzales', '12345682', 'veronica.gonzales@prayaga.biz', 
       password, 'Contrato Temporal', '2021-07-01', rolEmpleadoId, rocioId]
    );

    // Obtener ID de Veronica
    const [veronicaResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['veronica.gonzales@prayaga.biz']
    );
    const veronicaId = veronicaResult[0].id;
    console.log(`   ✓ Veronica creada con ID: ${veronicaId}\n`);

    // LIMPIAR DATOS ANTERIORES SI EXISTEN
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [veronicaId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [veronicaId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [veronicaId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - 5 PERIODOS = 90 DIAS)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1 - 5 períodos = 90 días)...');

    const periodosGanados = [
      { inicio: '2021-07-01', fin: '2022-06-30', dias: 15, periodo: '2021-2022', obs: 'Regimen PYME (15 dias de Vacaciones) - Gozadas' },
      { inicio: '2022-07-01', fin: '2023-06-30', dias: 15, periodo: '2022-2023', obs: 'Regimen PYME (15 dias de Vacaciones) - Gozadas' },
      { inicio: '2023-07-01', fin: '2024-06-30', dias: 30, periodo: '2023-2024', obs: 'Regimen Gral (30 dias de vacaciones) - De acuerdo a Reunion 27 ago 24' },
      { inicio: '2024-07-01', fin: '2025-06-30', dias: 30, periodo: '2024-2025', obs: 'Regimen Gral (30 dias de vacaciones) - De acuerdo a Reunion 27 ago 24' },
      { inicio: '2025-07-01', fin: '2026-06-30', dias: 0, periodo: '2025-2026', obs: 'Periodo futuro' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      if (p.dias > 0) {
        const estado = p.obs.includes('Gozadas') ? 'gozadas' : 'pendiente';
        
        const [result] = await pool.execute(
          `INSERT INTO periodos_vacaciones 
           (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
            dias_gozados, tiempo_trabajado, estado, observaciones)
           VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
          [veronicaId, p.inicio, p.fin, p.dias, estado, p.obs]
        );
        
        if (!primerPeriodoId) primerPeriodoId = result.insertId;
        
        console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días - ${p.obs}`);
      }
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2 - 6 salidas)...');

    const salidas = [
      { salida: '2025-04-11', retorno: '2025-04-12', dias: 1, obs: 'correo 10 abr - periodo 2023-2024' },
      { salida: '2025-05-07', retorno: '2025-05-19', dias: 12, obs: 'Correo 29 abr - periodo 2023-2024 (5 días)/ 2024-2025 ((7 días)el ultimo periodo adelantado)' },
      { salida: '2025-05-19', retorno: '2025-05-21', dias: 2, obs: 'Correo 21 myo - periodo 2024-2025' },
      { salida: '2025-09-24', retorno: '2025-10-30', dias: 8, obs: 'Correo 24 de setiemnbre - periodo 2024-2025' },
      { salida: '2025-12-19', retorno: '2025-12-20', dias: 1, obs: 'Correo del 17 de diciembre - 2024-2025' },
      { salida: '2025-12-26', retorno: '2025-12-29', dias: 1, obs: 'Correo del 23 diciembre - vacaciones 26 dic -2024-2025' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [veronicaId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [veronicaId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2021-2022', dias: 15, estado: 'gozadas' },
      { periodo: '2022-2023', dias: 15, estado: 'gozadas' },
      { periodo: '2023-2024', dias: 6, estado: 'parcial' },
      { periodo: '2024-2025', dias: 18, estado: 'parcial' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, veronicaId, `%${p.periodo}%`]
      );
      
      const correspondiente = p.periodo.includes('2021') || p.periodo.includes('2022-2023') ? 15 : 30;
      const pendiente = correspondiente - p.dias;
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días gozados, ${pendiente} pendientes (${p.estado})`);
    }

    // ====================================
    // RESUMEN FINAL
    // ====================================
    const [resumen] = await pool.execute(
      `SELECT 
         SUM(dias_correspondientes) as total_ganados
       FROM periodos_vacaciones
       WHERE empleado_id = ?`,
      [veronicaId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ VERONICA GONZALES CREADA EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: veronica.gonzales@prayaga.biz');
    console.log('🔑 Contraseña: Veronica2024');
    console.log('👔 Cargo: Contrato Temporal');
    console.log(`📊 Jefa directa: ${rocioId ? 'Rocío Picón (Contadora)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (4 períodos activos)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n📝 NOTA: Períodos mixtos PYME (15 días) y Régimen General (30 días)');
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearVeronica();
