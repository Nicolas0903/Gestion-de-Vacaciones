// Script para actualizar Enrique Agapito - Jefe de Operaciones
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function actualizarEnrique() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('🚀 Actualizando Enrique Agapito - Jefe de Operaciones...\n');

    // ====================================
    // 1. ACTUALIZAR EMAIL Y DATOS DE ENRIQUE
    // ====================================
    console.log('👤 Actualizando email de Enrique Agapito...');
    
    const password = await bcrypt.hash('Jefe2024', 10);

    // Buscar si existe con el email antiguo
    const [enriqueViejo] = await pool.execute(
      'SELECT id FROM empleados WHERE email = ?',
      ['enrique.sevillano@prayaga.biz']
    );

    let enriqueId;

    if (enriqueViejo.length > 0) {
      // Actualizar el email
      await pool.execute(
        'UPDATE empleados SET email = ?, password = ? WHERE id = ?',
        ['enrique.agapito@prayaga.biz', password, enriqueViejo[0].id]
      );
      enriqueId = enriqueViejo[0].id;
      console.log(`   ✓ Email actualizado de enrique.sevillano@prayaga.biz a enrique.agapito@prayaga.biz`);
    } else {
      // Buscar con el email nuevo
      const [enriqueNuevo] = await pool.execute(
        'SELECT id FROM empleados WHERE email = ?',
        ['enrique.agapito@prayaga.biz']
      );
      
      if (enriqueNuevo.length > 0) {
        enriqueId = enriqueNuevo[0].id;
        console.log(`   ✓ Enrique ya existe con email correcto`);
      } else {
        // Crear nuevo
        const [result] = await pool.execute(
          `INSERT INTO empleados 
           (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['JEF001', 'Enrique Agapito', 'Sevillano', '12345678', 'enrique.agapito@prayaga.biz', 
           password, 'Jefe de Operaciones', '2017-03-01', 3, null]
        );
        enriqueId = result.insertId;
        console.log(`   ✓ Enrique creado con ID: ${enriqueId}`);
      }
    }

    // LIMPIAR DATOS ANTERIORES
    console.log('\n🧹 Limpiando datos de vacaciones anteriores...');
    await pool.execute('DELETE FROM historial_vacaciones WHERE empleado_id = ?', [enriqueId]);
    await pool.execute('DELETE FROM solicitudes_vacaciones WHERE empleado_id = ?', [enriqueId]);
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [enriqueId]);
    console.log('✓ Datos anteriores eliminados\n');

    // ====================================
    // 2. PERIODOS GANADOS (TABLA 1 - 8 PERIODOS = 150 DIAS)
    // ====================================
    console.log('📅 Creando PERIODOS GANADOS (8 períodos = 150 días)...');

    const periodosGanados = [
      { inicio: '2017-03-01', fin: '2018-02-28', dias: 15, periodo: '2017-2018', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2018-03-01', fin: '2019-02-28', dias: 15, periodo: '2018-2019', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2019-03-01', fin: '2020-02-28', dias: 15, periodo: '2019-2020', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2020-03-01', fin: '2021-02-28', dias: 15, periodo: '2020-2021', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2021-03-01', fin: '2022-02-28', dias: 15, periodo: '2021-2022', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2022-03-01', fin: '2023-02-28', dias: 15, periodo: '2022-2023', obs: 'Regimen Laboral Especial (15 dias de Vacaciones) - Gozado' },
      { inicio: '2023-03-01', fin: '2024-02-28', dias: 30, periodo: '2023-2024', obs: 'Regimen Gral (30 dias de vacaciones) - Según Reunión 27/6/24-Gozado' },
      { inicio: '2024-03-01', fin: '2025-02-28', dias: 30, periodo: '2024-2025', obs: 'Regimen Gral (30 dias de vacaciones)' },
    ];

    let primerPeriodoId = null;
    
    for (const p of periodosGanados) {
      const estado = p.obs.includes('Gozado') ? 'gozadas' : 'pendiente';
      
      const [result] = await pool.execute(
        `INSERT INTO periodos_vacaciones 
         (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, 
          dias_gozados, tiempo_trabajado, estado, observaciones)
         VALUES (?, ?, ?, ?, 0, '12 meses', ?, ?)`,
        [enriqueId, p.inicio, p.fin, p.dias, estado, p.obs]
      );
      
      if (!primerPeriodoId) primerPeriodoId = result.insertId;
      
      console.log(`   ✓ Periodo ${p.periodo}: ${p.dias} días`);
    }

    // ====================================
    // 3. SALIDAS/VACACIONES GOZADAS (TABLA 2 - MUCHAS SALIDAS)
    // ====================================
    console.log('\n🗓️  Registrando SALIDAS GOZADAS (tabla 2)...');

    const salidas = [
      // Registros anteriores sin detalle (períodos 2017-2022)
      { salida: '2017-03-01', retorno: '2022-02-28', dias: 75, obs: 'Registros anteriores - Vacaciones períodos 2017-2022 (sin detalle de fechas)' },
      // Registros con detalle desde 2022
      { salida: '2023-05-15', retorno: '2023-05-19', dias: 4, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2023-06-27', retorno: '2023-06-28', dias: 1, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2023-07-26', retorno: '2023-07-27', dias: 1, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2023-08-23', retorno: '2023-08-04', dias: 1, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2023-10-09', retorno: '2023-10-13', dias: 4, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2023-12-19', retorno: '2023-12-20', dias: 1, obs: 'Vacaciones periodo 2022-2023' },
      { salida: '2024-01-19', retorno: '2024-01-05', dias: 4, obs: '(3 días) (1) vacaciones periodo 2022-2023 + (1) Vacaciones periodo 2023-2024 - Correo 10 myo 2024' },
      { salida: '2024-08-05', retorno: '2024-08-07', dias: 2, obs: '02 días Vacaciones periodo 2023-2024 - Correo 2 agosto' },
      { salida: '2024-10-14', retorno: '2024-10-21', dias: 7, obs: '07 días Vacaciones periodo 2023-2024 - Corre del 07 oct' },
      { salida: '2024-12-19', retorno: '2024-12-20', dias: 1, obs: '01 días Vacaciones periodo 2023-2024 - Correo 12 dic' },
      { salida: '2025-01-26', retorno: '2025-01-20', dias: 7, obs: '07 días vacaciones periodo 2023-2024 - Correo 12 dic' },
      { salida: '2025-04-11', retorno: '2025-04-14', dias: 3, obs: '03  día vacaciones periodo 2023-2024 - Correo 08 abr.' },
      { salida: '2025-05-12', retorno: '2025-05-19', dias: 7, obs: '07 días vacaciones periodo 2023-2024 - Correo 08 abr.' },
      { salida: '2025-08-04', retorno: '2025-08-05', dias: 2, obs: '02 día vacaciones periodo 2023-2024 - Correo 01 ago' },
      { salida: '2025-08-06', retorno: '2025-08-08', dias: 2, obs: '02 día vacaciones periodo 2024-2025 - Correo 01 ago.' },
      { salida: '2025-09-29', retorno: '2025-09-30', dias: 1, obs: '01 día vacaciones periodo 2024-2025 - Correo 02 oct.' },
      { salida: '2025-10-14', retorno: '2025-10-17', dias: 3, obs: '03 días vacaciones periodo 2024-2025 - Correo 10 oct.' },
      { salida: '2025-12-17', retorno: '2026-01-05', dias: 19, obs: '19 días vacaciones periodo 2024-2025 - Correo 01 dic' },
    ];

    let totalDiasGozados = 0;
    
    for (const s of salidas) {
      // Crear solicitud aprobada
      const [solicitudResult] = await pool.execute(
        `INSERT INTO solicitudes_vacaciones 
         (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, 
          dias_solicitados, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'aprobada')`,
        [enriqueId, primerPeriodoId, s.salida, s.retorno, s.dias, s.obs]
      );

      // Crear historial
      await pool.execute(
        `INSERT INTO historial_vacaciones 
         (empleado_id, solicitud_id, fecha_salida, fecha_retorno, dias_tomados, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [enriqueId, solicitudResult.insertId, s.salida, s.retorno, s.dias, s.obs]
      );
      
      totalDiasGozados += s.dias;
      console.log(`   ✓ ${s.dias} días - ${s.obs.substring(0, 50)}...`);
    }

    // ====================================
    // 4. ACTUALIZAR DIAS GOZADOS POR PERIODO
    // ====================================
    console.log('\n📊 Actualizando días gozados por período...');
    const diasGozadosPorPeriodo = [
      { periodo: '2017-2018', dias: 15, estado: 'gozadas' },
      { periodo: '2018-2019', dias: 15, estado: 'gozadas' },
      { periodo: '2019-2020', dias: 15, estado: 'gozadas' },
      { periodo: '2020-2021', dias: 15, estado: 'gozadas' },
      { periodo: '2021-2022', dias: 15, estado: 'gozadas' },
      { periodo: '2022-2023', dias: 15, estado: 'gozadas' },
      { periodo: '2023-2024', dias: 30, estado: 'gozadas' },
      { periodo: '2024-2025', dias: 25, estado: 'parcial' }
    ];

    for (const p of diasGozadosPorPeriodo) {
      await pool.execute(
        `UPDATE periodos_vacaciones 
         SET dias_gozados = ?, estado = ?
         WHERE empleado_id = ? AND observaciones LIKE ?`,
        [p.dias, p.estado, enriqueId, `%${p.periodo}%`]
      );
      
      const correspondiente = p.periodo.includes('2023-2024') || p.periodo.includes('2024-2025') ? 30 : 15;
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
      [enriqueId]
    );

    const totalGanados = resumen[0].total_ganados;
    const totalPendientes = totalGanados - totalDiasGozados;

    console.log('\n========================================');
    console.log('✅ ENRIQUE AGAPITO ACTUALIZADO');
    console.log('========================================\n');
    console.log('📧 Email: enrique.agapito@prayaga.biz (CORREGIDO)');
    console.log('🔑 Contraseña: Jefe2024');
    console.log('👔 Cargo: Jefe de Operaciones\n');
    console.log('📈 RESUMEN DE VACACIONES:');
    console.log(`   • Vacaciones GANADAS: ${totalGanados} días (8 períodos)`);
    console.log(`   • Vacaciones GOZADAS: ${totalDiasGozados} días (${salidas.length} salidas)`);
    console.log(`   • Días PENDIENTES: ${totalPendientes} días`);
    console.log('\n📝 NOTA: Períodos mixtos Régimen Especial (15 días) y Régimen General (30 días)');
    console.log('\n========================================\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

actualizarEnrique();
