// Script FINAL para crear Magali Sevillano - Periodos GANADOS intactos + SALIDAS separadas
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function crearMagali() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Creando información CORRECTA de Magali Sevillano...\n');

    // 1. Verificar/crear roles necesarios
    console.log('🔍 Verificando roles...');
    
    // Obtener ID del rol gerente_general (debería existir ya)
    let [roleResult] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ?',
      ['gerente_general']
    );
    
    // Si no existe, crearlo
    if (roleResult.length === 0) {
      await pool.execute(
        'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
        ['gerente_general', 'Gerente General']
      );
      [roleResult] = await pool.execute(
        'SELECT id FROM roles WHERE nombre = ?',
        ['gerente_general']
      );
    }
    
    const rolId = roleResult[0].id;
    console.log(`✓ Rol gerente_general ID: ${rolId}\n`);

    // 2. Crear empleado Magali Sevillano
    console.log('👤 Creando empleado Magali Sevillano...');
    const hashedPassword = await bcrypt.hash('Magali2024', 10);

    // Obtener ID de Rocío (contadora) como jefe
    const [rocioResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['rocio.picon@prayaga.biz']
    );
    const jefeId = rocioResult.length > 0 ? rocioResult[0].id : null;

    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       nombres = VALUES(nombres), 
       apellidos = VALUES(apellidos),
       cargo = VALUES(cargo),
       rol_id = VALUES(rol_id),
       jefe_id = VALUES(jefe_id)`,
      ['MAGA001', 'Magali', 'Sevillano', '12345678', 'magali.sevillano@prayaga.biz', 
       hashedPassword, 'Gerente General', '2010-06-08', rolId, jefeId]
    );
    console.log('✓ Empleado Magali Sevillano creado/actualizado\n');

    // 3. Obtener ID de Magali
    const [magaliResult] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['magali.sevillano@prayaga.biz']
    );

    const magaliId = magaliResult[0].id;
    console.log(`✓ Magali ID: ${magaliId}\n`);

    // LIMPIAR DATOS ANTERIORES
    console.log('🧹 Limpiando datos anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [magaliId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [magaliId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [magaliId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 1. PERIODOS GANADOS (SIN MODIFICAR)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (tabla 1 - sin modificaciones)...');

    const periodosGanados = [
      { inicio: '2010-06-08', fin: '2011-06-07', dias: 30, periodo: '2010-2011' },
      { inicio: '2011-06-08', fin: '2012-06-07', dias: 30, periodo: '2011-2012' },
      { inicio: '2012-06-08', fin: '2013-06-07', dias: 30, periodo: '2012-2013' },
      { inicio: '2013-06-08', fin: '2014-06-07', dias: 30, periodo: '2013-2014' },
      { inicio: '2014-06-08', fin: '2015-06-07', dias: 30, periodo: '2014-2015' },
      { inicio: '2015-06-08', fin: '2016-06-07', dias: 30, periodo: '2015-2016' },
      { inicio: '2016-06-08', fin: '2017-06-07', dias: 30, periodo: '2016-2017' },
      { inicio: '2017-06-08', fin: '2018-06-07', dias: 30, periodo: '2017-2018' },
      { inicio: '2018-06-08', fin: '2019-06-07', dias: 30, periodo: '2018-2019' },
      { inicio: '2019-06-08', fin: '2020-06-06', dias: 30, periodo: '2019-2020' },
      { inicio: '2020-06-05', fin: '2021-06-07', dias: 30, periodo: '2020-2021' },
      { inicio: '2021-06-08', fin: '2022-06-07', dias: 30, periodo: '2021-2022' },
      { inicio: '2022-06-08', fin: '2023-06-07', dias: 30, periodo: '2022-2023' },
      { inicio: '2023-06-08', fin: '2024-06-07', dias: 30, periodo: '2023-2024' },
      { inicio: '2024-06-08', fin: '2025-06-07', dias: 30, periodo: '2024-2025' },
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
        [magaliId, p.inicio, p.fin, p.dias, estado, `Periodo ${p.periodo} - ${motivo.toUpperCase()}`]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días (${motivo})`);
    }

    // ====================================
    // 2. SALIDAS/VACACIONES GOZADAS
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2 - tal cual)...');

    const salidas = [
      { salida: '2013-08-05', retorno: '2013-08-09', dias: 5, obs: '5 días Vacaciones periodo 2010-2011' },
      { salida: '2015-08-03', retorno: '2015-08-13', dias: 11, obs: '11 días Vacaciones periodo 2010-2011' },
      { salida: '2016-08-01', retorno: '2016-08-31', dias: 24, obs: '14 días 2010-2011 + 10 días Vacaciones periodo 2011-2012' },
      { salida: '2016-08-06', retorno: '2016-08-14', dias: 7, obs: '07 días Vacaciones periodo 2011-2012' },
      { salida: '2017-02-06', retorno: '2017-02-13', dias: 11, obs: '11 días Vacaciones periodo 2011-2012' },
      { salida: '2017-07-27', retorno: '2017-08-10', dias: 15, obs: '02 días Vacaciones periodo 2011-2012 + 13 días periodo 2012-2013' },
      { salida: '2018-01-22', retorno: '2018-01-30', dias: 9, obs: '09 días Vacaciones periodo 2012-2013' },
      { salida: '2019-02-25', retorno: '2019-03-06', dias: 5, obs: '08 días Vacaciones periodo 2012-2013 + 1 día periodo 2013+2014' },
      { salida: '2019-02-25', retorno: '2019-03-11', dias: 15, obs: '15 días Vacaciones periodo 2013-2014' },
      { salida: '2019-05-03', retorno: '2019-08-18', dias: 14, obs: '14 días Vacaciones periodo 2013-2014' },
      { salida: '2020-01-29', retorno: '2020-02-05', dias: 5, obs: '05 días Vacaciones periodo 2014-2015' },
      { salida: '2020-02-10', retorno: '2020-02-16', dias: 7, obs: '07 días Vacaciones periodo 2014-2015' },
      { salida: '2020-10-24', retorno: '2020-10-27', dias: 4, obs: '04 días Vacaciones periodo 2014-2015' },
      { salida: '2021-11-19', retorno: '2021-11-22', dias: 3, obs: '03 días Vacaciones periodo 2014-2015' },
      { salida: '2022-01-05', retorno: '2022-01-13', dias: 8, obs: '08 días Vacaciones periodo 2014-2015' },
      { salida: '2022-09-05', retorno: '2022-09-15', dias: 6, obs: '03 días Vacaciones periodo 2014-2015 + 3 días periodo 2015-2016' },
      { salida: '2022-12-20', retorno: '2023-01-05', dias: 16, obs: '16 días vacaciones periodo 2015 - 2016' },
      { salida: '2023-10-24', retorno: '2023-11-08', dias: 15, obs: '11 días vacaciones periodo 2015 - 2016 + 4 días periodo 2016-2017' },
      { salida: '2024-07-25', retorno: '2024-08-12', dias: 18, obs: '18 días vacaciones periodo 2016-2017' },
      { salida: '2024-09-13', retorno: '2024-09-16', dias: 3, obs: '03 días vacaciones periodo 2016-2017' },
      { salida: '2025-01-31', retorno: '2025-02-03', dias: 3, obs: '03 días vacaciones periodo 2016-2017' },
      { salida: '2025-07-02', retorno: '2025-07-03', dias: 2, obs: '02 días vacaciones periodo 2016-2017' },
      { salida: '2025-07-04', retorno: '2025-07-10', dias: 6, obs: '08 días vacaciones periodo 2017-2018' },
      { salida: '2025-10-13', retorno: '2025-10-14', dias: 1, obs: '01 días vacaciones periodo 2017-2018' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [magaliId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [magaliId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.obs}`);
    }

    // Actualizar dias_gozados en cada período según el Excel
    console.log('\n📊 Actualizando días gozados por período (según Excel)...');
    const diasGozadosPorPeriodo = [
      { periodo: '2010-2011', dias: 30, estado: 'gozadas' },
      { periodo: '2011-2012', dias: 30, estado: 'gozadas' },
      { periodo: '2012-2013', dias: 30, estado: 'gozadas' },
      { periodo: '2013-2014', dias: 30, estado: 'gozadas' },
      { periodo: '2014-2015', dias: 30, estado: 'gozadas' },
      { periodo: '2015-2016', dias: 30, estado: 'gozadas' },
      { periodo: '2016-2017', dias: 30, estado: 'gozadas' },
      { periodo: '2017-2018', dias: 2, estado: 'parcial' },
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
        [p.dias, p.estado, magaliId, `%${p.periodo}%`]
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
      [magaliId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ MAGALI SEVILLANO - DATOS CORRECTOS');
    console.log('========================================\n');
    console.log('📊 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (15 períodos de 30 días)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearMagali();
