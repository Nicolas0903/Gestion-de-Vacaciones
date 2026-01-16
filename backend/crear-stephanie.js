// Script para crear Stephanie Agapito - Encargada de Marketing
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearStephanie() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Stephanie Agapito - Encargada de Marketing...\n');

    // ====================================
    // 1. CREAR STEPHANIE AGAPITO
    // ====================================
    console.log('👤 Creando empleada Stephanie Agapito...');
    
    const password = await bcrypt.hash('Stephanie2024', 10);
    
    // Buscar ID del rol analista_senior
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['analista_senior']
    );
    const rolAnalistaSeniorId = rolesResult[0].id;

    // Buscar ID de Magali (Gerente General) como jefa
    const [magaliResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['magali.sevillano@prayaga.biz']
    );
    const magaliId = magaliResult.length > 0 ? magaliResult[0].id : null;

    // Crear o actualizar Stephanie
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['MKT001', 'Stephanie', 'Agapito', '12345683', 'stephanie.agapito@prayaga.biz', 
       password, 'Encargada de Marketing', '2021-11-12', rolAnalistaSeniorId, magaliId]
    );

    // Obtener ID de Stephanie
    const [stephanieResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['stephanie.agapito@prayaga.biz']
    );
    const stephanieId = stephanieResult[0].id;
    console.log(`   ✓ Stephanie creada con ID: ${stephanieId}\n`);

    // LIMPIAR DATOS ANTERIORES SI EXISTEN
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [stephanieId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [stephanieId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [stephanieId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - 3 PERIODOS = 60 DIAS)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1 - 3 períodos = 60 días)...');

    const periodosGanados = [
      { inicio: '2021-11-12', fin: '2022-11-11', dias: 15, periodo: '2021-2022', obs: 'Regimen PYME (15 dias de Vacaciones)- Gozadas' },
      { inicio: '2022-11-12', fin: '2023-11-11', dias: 15, periodo: '2022-2023', obs: 'Regimen PYME (15 dias de Vacaciones)- Gozadas' },
      { inicio: '2023-11-12', fin: '2024-11-11', dias: 30, periodo: '2023-2024', obs: 'Regimen Gral (30 dias de vacaciones ) - Segun Reunion 27/8/24-Gozado' },
      { inicio: '2024-11-12', fin: '2025-11-11', dias: 30, periodo: '2024-2025', obs: 'Regimen Gral (30 dias de vacaciones)' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const estado = p.obs.includes('Gozada') || p.obs.includes('Gozado') ? 'gozadas' : 'pendiente';
      
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
        [stephanieId, p.inicio, p.fin, p.dias, estado, p.obs]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días`);
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2 - 8 SALIDAS)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2 - 8 salidas)...');

    const salidas = [
      { salida: '2023-02-28', retorno: '2023-03-06', dias: 6, obs: 'Periodo 2021-2022 - correro 16 feb 23' },
      { salida: '2023-04-26', retorno: '2023-05-05', dias: 9, obs: 'Periodo 2021-2022 - correro 16 feb 23' },
      { salida: '2024-10-09', retorno: '2024-10-23', dias: 15, obs: 'Periodo 2022-2023 - correo 30 set 24' },
      { salida: '2024-10-24', retorno: '2024-10-29', dias: 5, obs: 'Periodo 2023-2024 - correo 30 set 24' },
      { salida: '2025-09-22', retorno: '2025-09-23', dias: 1, obs: 'Periodo 2023-2024 - WSP 21 set 25' },
      { salida: '2025-10-20', retorno: '2025-10-27', dias: 7, obs: 'Periodo 2023-2024 - correo 10 oct 25' },
      { salida: '2025-12-15', retorno: '2025-12-19', dias: 4, obs: 'Periodo 2023-2024 - correo 12 dic 25' },
      { salida: '2025-12-26', retorno: '2025-12-27', dias: 1, obs: 'Periodo 2023-2024 - comunic.MS telef. 22 dic' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [stephanieId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stephanieId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.dias} días - ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2021-2022', dias: 15, estado: 'gozadas' },
      { periodo: '2022-2023', dias: 15, estado: 'gozadas' },
      { periodo: '2023-2024', dias: 18, estado: 'parcial' },
      { periodo: '2024-2025', dias: 0, estado: 'pendiente' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, stephanieId, `%${p.periodo}%`]
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
      [stephanieId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ STEPHANIE AGAPITO CREADA EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: stephanie.agapito@prayaga.biz');
    console.log('🔑 Contraseña: Stephanie2024');
    console.log('👔 Cargo: Encargada de Marketing');
    console.log(`📊 Jefa directa: ${magaliId ? 'Magali Sevillano (Gerente General)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (4 períodos)`);
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

crearStephanie();
