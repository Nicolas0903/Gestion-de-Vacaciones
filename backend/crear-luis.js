// Script para crear usuario Luis Hurtado
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function crearLuis() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('🚀 Creando usuario Luis Hurtado...\n');

    // 1. Obtener ID de Magali (jefe directo)
    const [magaliResult] = await pool.execute(
      "SELECT id FROM empleados WHERE email = 'magali.sevillano@prayaga.biz'"
    );
    
    if (magaliResult.length === 0) {
      console.error('❌ No se encontró a Magali Sevillano');
      return;
    }
    const magaliId = magaliResult[0].id;
    console.log(`✅ Jefe directo (Magali) ID: ${magaliId}`);

    // 2. Obtener rol de empleado
    const [rolResult] = await pool.execute(
      "SELECT id FROM roles WHERE nombre = 'empleado'"
    );
    const rolEmpleadoId = rolResult[0].id;

    // 3. Generar hash de contraseña
    const passwordPlano = 'Luis2025';
    const hashedPassword = await bcrypt.hash(passwordPlano, 10);

    // 4. Verificar si ya existe
    const [existente] = await pool.execute(
      "SELECT id FROM empleados WHERE email = 'luis.hurtado@prayaga.biz'"
    );

    let luisId;
    
    if (existente.length > 0) {
      luisId = existente[0].id;
      console.log(`⚠️ Luis ya existe con ID: ${luisId}, actualizando datos...`);
      
      await pool.execute(`
        UPDATE empleados SET
          codigo_empleado = 'KAM001',
          nombres = 'Brando Luis',
          apellidos = 'Hurtado Huaman',
          dni = '73385504',
          cargo = 'Key Account Manager',
          fecha_ingreso = '2025-02-15',
          jefe_id = ?,
          rol_id = ?,
          activo = TRUE
        WHERE id = ?
      `, [magaliId, rolEmpleadoId, luisId]);
    } else {
      // Crear nuevo empleado
      const [result] = await pool.execute(`
        INSERT INTO empleados (
          codigo_empleado, nombres, apellidos, dni, email, password,
          cargo, fecha_ingreso, jefe_id, rol_id, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'KAM001',
        'Brando Luis',
        'Hurtado Huaman',
        '73385504',
        'luis.hurtado@prayaga.biz',
        hashedPassword,
        'Key Account Manager',
        '2025-02-15',
        magaliId,
        rolEmpleadoId,
        true
      ]);
      
      luisId = result.insertId;
      console.log(`✅ Empleado creado con ID: ${luisId}`);
    }

    // 5. Crear período de vacaciones (desde fecha ingreso)
    // Como ingresó el 15/02/2025, su primer período sería 2025-2026
    // Régimen PYME: 15 días por año
    
    // Eliminar períodos existentes
    await pool.execute('DELETE FROM periodos_vacaciones WHERE empleado_id = ?', [luisId]);
    
    // Crear primer período
    await pool.execute(`
      INSERT INTO periodos_vacaciones (
        empleado_id, fecha_inicio_periodo, fecha_fin_periodo, 
        dias_correspondientes, dias_gozados, tiempo_trabajado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      luisId,
      '2025-02-15',
      '2026-02-14',
      15,
      0,
      '12 meses',
      'Primer período - Régimen PYME (15 días)'
    ]);
    
    console.log('✅ Período de vacaciones 2025-2026 creado');

    // Resumen
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMEN - LUIS HURTADO');
    console.log('='.repeat(50));
    console.log(`   Código: KAM001`);
    console.log(`   Nombre: Brando Luis Hurtado Huaman`);
    console.log(`   DNI: 73385504`);
    console.log(`   Email: luis.hurtado@prayaga.biz`);
    console.log(`   Cargo: Key Account Manager`);
    console.log(`   Fecha ingreso: 15/02/2025`);
    console.log(`   Jefe directo: Magali Sevillano`);
    console.log(`   Contraseña: ${passwordPlano}`);
    console.log('='.repeat(50));
    console.log('\n✅ Usuario creado exitosamente\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

crearLuis();
