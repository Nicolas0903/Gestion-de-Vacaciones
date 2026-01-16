// Script para crear Ricardo Martinez - Gerente de Consultoría
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearRicardo() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando Ricardo Martinez - Gerente de Consultoría...\n');

    // ====================================
    // 1. CREAR RICARDO MARTINEZ
    // ====================================
    console.log('👤 Creando empleado Ricardo Martinez...');
    
    const password = await bcrypt.hash('Ricardo2024', 10);
    
    // Buscar ID del rol gerente_consultoria
    const [rolesResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['gerente_consultoria']
    );
    const rolGerenteConsultoriaId = rolesResult[0].id;

    // Buscar ID de Rocío (contadora) para asignarla como quien administra a Ricardo
    const [contadoraResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['rocio.picon@prayaga.biz']
    );
    const rocioId = contadoraResult.length > 0 ? contadoraResult[0].id : null;

    // Crear o actualizar Ricardo
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         password = VALUES(password),
         cargo = VALUES(cargo),
         rol_id = VALUES(rol_id),
         jefe_id = VALUES(jefe_id)`,
      ['GC001', 'Ricardo', 'Martinez', '12345680', 'ricardo.martinez@prayaga.biz', 
       password, 'Gerente de Consultoría', '2010-08-01', rolGerenteConsultoriaId, rocioId]
    );

    // Obtener ID de Ricardo
    const [ricardoResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['ricardo.martinez@prayaga.biz']
    );
    const ricardoId = ricardoResult[0].id;
    console.log(`   ✓ Ricardo creado con ID: ${ricardoId}\n`);

    // LIMPIAR DATOS ANTERIORES SI EXISTEN
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [ricardoId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [ricardoId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [ricardoId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - SIN MODIFICAR)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1)...');

    const periodosGanados = [
      { inicio: '2010-08-01', fin: '2011-07-31', periodo: '2010-2011' },
      { inicio: '2011-08-01', fin: '2012-07-31', periodo: '2011-2012' },
      { inicio: '2012-08-01', fin: '2013-07-31', periodo: '2012-2013' },
      { inicio: '2013-08-01', fin: '2014-07-31', periodo: '2013-2014' },
      { inicio: '2014-08-01', fin: '2015-07-31', periodo: '2014-2015' },
      { inicio: '2015-08-01', fin: '2016-07-31', periodo: '2015-2016' },
      { inicio: '2016-08-01', fin: '2017-07-31', periodo: '2016-2017' },
      { inicio: '2017-08-01', fin: '2018-07-31', periodo: '2017-2018' },
      { inicio: '2018-08-01', fin: '2019-07-31', periodo: '2018-2019' },
      { inicio: '2019-08-01', fin: '2020-07-31', periodo: '2019-2020' },
      { inicio: '2020-08-01', fin: '2021-07-31', periodo: '2020-2021' },
      { inicio: '2021-08-01', fin: '2022-07-31', periodo: '2021-2022' },
      { inicio: '2022-08-01', fin: '2023-07-31', periodo: '2022-2023' },
      { inicio: '2023-08-01', fin: '2024-07-31', periodo: '2023-2024' },
      { inicio: '2024-08-01', fin: '2025-07-31', periodo: '2024-2025' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const motivo = p.inicio.substring(0, 4) >= '2016' ? 'Pendiente' : 'Gozadas';
      const estado = p.inicio.substring(0, 4) >= '2016' ? 'pendiente' : 'gozadas';
      
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
        [ricardoId, p.inicio, p.fin, 30, estado, `Periodo ${p.periodo} - ${motivo}`]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: 30 días (${motivo})`);
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2)...');

    const salidas = [
      { salida: '2013-02-07', retorno: '2013-02-12', dias: 6, obs: '6 días Vacaciones periodo 2010-2011' },
      { salida: '2013-07-22', retorno: '2013-07-26', dias: 5, obs: '5 días Vacaciones periodo 2010-2011' },
      { salida: '2014-10-02', retorno: '2014-10-16', dias: 7, obs: '7 días Vacaciones periodo 2010-2011' },
      { salida: '2015-05-01', retorno: '2015-05-08', dias: 8, obs: '8 días Vacaciones periodo 2010-2011' },
      { salida: '2016-06-28', retorno: '2016-07-03', dias: 6, obs: '4 días vacaciones periodo 2010-2011 + 02 días Vacaciones periodo 2011-2012' },
      { salida: '2017-02-06', retorno: '2017-02-17', dias: 11, obs: '12 días Vacaciones periodo 2011-2012' },
      { salida: '2017-12-26', retorno: '2018-01-02', dias: 7, obs: '8 días Vacaciones periodo 2011-2012' },
      { salida: '2018-02-05', retorno: '2018-02-19', dias: 14, obs: '8 días Vacaciones periodo 2011-2012 + 7 días Vacaciones Periodo 2012-2013' },
      { salida: '2019-01-14', retorno: '2019-01-27', dias: 13, obs: '14 días Vacaciones periodo 2012-2013' },
      { salida: '2019-05-06', retorno: '2019-05-08', dias: 2, obs: '2 días Vacaciones periodo 2012-2013' },
      { salida: '2019-07-23', retorno: '2019-07-25', dias: 2, obs: '3 días Vacaciones periodo 2012-2013' },
      { salida: '2019-10-02', retorno: '2019-10-03', dias: 1, obs: '2 días Vacaciones periodo 2012-2013' },
      { salida: '2020-01-13', retorno: '2020-01-23', dias: 10, obs: '2 días Vacaciones periodo 2012-2013+10 días Vacaciones Periodo 2013-2014' },
      { salida: '2021-01-05', retorno: '2021-01-19', dias: 14, obs: '15 días Vacaciones periodo 2013-2014' },
      { salida: '2021-05-03', retorno: '2021-05-09', dias: 6, obs: '3 días Vacaciones periodo 2013-2014 + 4 días vacaciones Periodo 2014-2015' },
      { salida: '2022-02-07', retorno: '2022-02-20', dias: 13, obs: '14 días Vacaciones periodo 2014-2015' },
      { salida: '2022-07-11', retorno: '2022-07-18', dias: 7, obs: '7 días Vacaciones periodo 2014-2015' },
      { salida: '2023-02-06', retorno: '2023-02-20', dias: 14, obs: '5 días vacaciones periodo 2014-2015 + 9 días vacaciones periodo 2015 -2016' },
      { salida: '2024-02-01', retorno: '2024-02-01', dias: 29, obs: '21 días vacaciones periodo 2015-2016 + 8 días vacaciones periodo 2016 -2017' },
      { salida: '2024-07-25', retorno: '2024-08-02', dias: 8, obs: '8 días vacaciones periodo 2016 - 2017' },
      { salida: '2024-12-27', retorno: '2024-12-30', dias: 3, obs: '3 días vacaciones periodo 2016 - 2017' },
      { salida: '2025-10-15', retorno: '2025-10-20', dias: 5, obs: '5 días vacaciones periodo 2016 - 2017' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [ricardoId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ricardoId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.obs}`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2010-2011', dias: 30, estado: 'gozadas' },
      { periodo: '2011-2012', dias: 30, estado: 'gozadas' },
      { periodo: '2012-2013', dias: 30, estado: 'gozadas' },
      { periodo: '2013-2014', dias: 30, estado: 'gozadas' },
      { periodo: '2014-2015', dias: 30, estado: 'gozadas' },
      { periodo: '2015-2016', dias: 30, estado: 'gozadas' },
      { periodo: '2016-2017', dias: 11, estado: 'parcial' },
      { periodo: '2017-2018', dias: 0, estado: 'pendiente' },
      { periodo: '2018-2019', dias: 0, estado: 'pendiente' },
      { periodo: '2019-2020', dias: 0, estado: 'pendiente' },
      { periodo: '2020-2021', dias: 0, estado: 'pendiente' },
      { periodo: '2021-2022', dias: 0, estado: 'pendiente' },
      { periodo: '2022-2023', dias: 0, estado: 'pendiente' },
      { periodo: '2023-2024', dias: 0, estado: 'pendiente' },
      { periodo: '2024-2025', dias: 0, estado: 'pendiente' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, ricardoId, `%${p.periodo}%`]
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
      [ricardoId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ RICARDO MARTINEZ CREADO EXITOSAMENTE');
    console.log('========================================\n');
    console.log('📧 Email: ricardo.martinez@prayaga.biz');
    console.log('🔑 Contraseña: Ricardo2024');
    console.log('👔 Cargo: Gerente de Consultoría');
    console.log(`📊 Administrado por: ${rocioId ? 'Rocío Picón (Contadora)' : 'Sin jefe asignado'}\n`);
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (15 períodos)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearRicardo();
