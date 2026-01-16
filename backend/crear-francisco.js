// Script para crear Francisco Perez - Consultor
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearFrancisco() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Francisco Perez - Consultor...\n');

    // ====================================
    // 1. CREAR FRANCISCO PEREZ
    // ====================================
    console.log('👤 Creando empleado Francisco Perez...');
    
    const password = await bcrypt.hash('Francisco2024', 10);
    
    // Buscar ID del rol consultor
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['consultor']
    );
    const rolConsultorId = rolesResult[0].id;

    // Buscar ID de Ricardo Martinez (Gerente de Consultoría) como jefe
    const [ricardoResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['ricardo.martinez@prayaga.biz']
    );
    const ricardoId = ricardoResult.length > 0 ? ricardoResult[0].id : null;

    // Crear o actualizar Francisco
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['CONS001', 'Francisco', 'Perez', '12345681', 'francisco.perez@prayaga.biz', 
       password, 'Consultor', '2011-02-01', rolConsultorId, ricardoId]
    );

    // Obtener ID de Francisco
    const [franciscoResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['francisco.perez@prayaga.biz']
    );
    const franciscoId = franciscoResult[0].id;
    console.log(`   ✓ Francisco creado con ID: ${franciscoId}\n`);

    // LIMPIAR DATOS ANTERIORES SI EXISTEN
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [franciscoId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [franciscoId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [franciscoId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - 6 PERIODOS)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1 - 6 períodos = 180 días)...');

    const periodosGanados = [
      { inicio: '2017-01-02', fin: '2018-01-01', periodo: '2017-2018', estado: 'gozadas' },
      { inicio: '2018-01-02', fin: '2019-01-01', periodo: '2018-2019', estado: 'parcial' },
      { inicio: '2019-01-02', fin: '2020-01-01', periodo: '2019-2020', estado: 'pendiente' },
      { inicio: '2020-01-02', fin: '2021-01-01', periodo: '2020-2021', estado: 'pendiente' },
      { inicio: '2021-01-02', fin: '2022-01-01', periodo: '2021-2022', estado: 'pendiente' },
      { inicio: '2022-01-02', fin: '2023-01-01', periodo: '2022-2023', estado: 'pendiente' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const motivoTexto = p.estado === 'gozadas' ? 'GOZADO' : 
                          p.estado === 'parcial' ? 'Aplicando' : 
                          'No Gozadas';
      
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
        [franciscoId, p.inicio, p.fin, 30, p.estado, `Periodo ${p.periodo} - ${motivoTexto}`]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: 30 días (${motivoTexto})`);
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2 - 13 salidas)...');

    const salidas = [
      { salida: '2018-12-26', retorno: '2018-12-27', dias: 1, obs: '1 dia vacaciones - Periodo 2017-2018' },
      { salida: '2018-12-01', retorno: '2018-12-31', dias: 15, obs: '15 Días Vacaciones - Periodo 2017-2018' },
      { salida: '2019-02-15', retorno: '2019-02-16', dias: 1, obs: '1 dia vacaciones - Periodo 2017-2018' },
      { salida: '2019-04-22', retorno: '2019-04-23', dias: 1, obs: '1 dia vacaciones - Periodo 2017-2018' },
      { salida: '2019-06-21', retorno: '2019-06-22', dias: 1, obs: '1 dia vacaciones - Periodo 2017-2018' },
      { salida: '2019-09-23', retorno: '2019-09-24', dias: 1, obs: '1 dia vacaciones - Periodo 2017-2018' },
      { salida: '2019-09-30', retorno: '2019-10-04', dias: 4, obs: '4 dia Vacaciones - Periodo 2017-2018' },
      { salida: '2022-12-19', retorno: '2023-01-02', dias: 14, obs: '6 días de vacaciones - periodo 2017-2018 / 8 días periodo de vacaciones periodo 2018-2019' },
      { salida: '2025-02-10', retorno: '2025-02-24', dias: 14, obs: '14 días Vacaciones - Periodo 2018-2019' },
      { salida: '2025-08-11', retorno: '2025-08-18', dias: 8, obs: '08 dia Vacaciones - Periodo 2018-2019' },
      { salida: '2025-08-19', retorno: '2025-08-25', dias: 6, obs: '06 dia Vacaciones - Periodo 2019-2020' },
      { salida: '2025-08-25', retorno: '2025-09-01', dias: 7, obs: '07 dia Vacaciones - Periodo 2019-2020' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [franciscoId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [franciscoId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2017-2018', dias: 30, estado: 'gozadas' },
      { periodo: '2018-2019', dias: 22, estado: 'parcial' },
      { periodo: '2019-2020', dias: 13, estado: 'parcial' },
      { periodo: '2020-2021', dias: 0, estado: 'pendiente' },
      { periodo: '2021-2022', dias: 0, estado: 'pendiente' },
      { periodo: '2022-2023', dias: 0, estado: 'pendiente' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, franciscoId, `%${p.periodo}%`]
      );
      
      if (p.dias > 0) {
        console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días gozados, ${30 - p.dias} pendientes (${p.estado})`);
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
      [franciscoId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ FRANCISCO PEREZ CREADO EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: francisco.perez@prayaga.biz');
    console.log('🔑 Contraseña: Francisco2024');
    console.log('👔 Cargo: Consultor');
    console.log(`📊 Jefe directo: ${ricardoId ? 'Ricardo Martinez (Gerente de Consultoría)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (6 períodos)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearFrancisco();
