-- Caja chica: crea tablas si no existen y añade fecha_deposito / comprobante_archivo si faltan.
-- Uso (desde la raíz del repo): mysql -u vacaciones_user -p gestorvacaciones < backend/sql/caja_chica_ingresos_fecha_adjunto.sql

CREATE TABLE IF NOT EXISTS caja_chica_periodos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  mes INT NOT NULL,
  estado ENUM('borrador', 'cerrado') NOT NULL DEFAULT 'borrador',
  saldo_cierre DECIMAL(12, 2) NULL COMMENT 'Total ingresos - total egresos al cerrar; arrastra al mes siguiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_caja_chica_anio_mes (anio, mes)
);

-- Tabla base (sin las columnas nuevas): sirve tanto para instalaciones viejas como para nuevas sin caja_chica.
CREATE TABLE IF NOT EXISTS caja_chica_ingresos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  periodo_id INT NOT NULL,
  tipo_motivo ENUM('caja_chica', 'deposito_adicional', 'saldo_anterior') NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  FOREIGN KEY (periodo_id) REFERENCES caja_chica_periodos(id) ON DELETE CASCADE,
  INDEX idx_caja_ingreso_periodo (periodo_id)
);

SET @sch = DATABASE();
SET @prep = '';

-- fecha_deposito
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sch AND TABLE_NAME = 'caja_chica_ingresos' AND COLUMN_NAME = 'fecha_deposito';

SET @prep = IF(@c = 0,
  'ALTER TABLE caja_chica_ingresos ADD COLUMN fecha_deposito DATE NULL COMMENT ''Fecha del depósito/transferencia cuando aplica'' AFTER monto',
  'SELECT 1');
PREPARE s1 FROM @prep;
EXECUTE s1;
DEALLOCATE PREPARE s1;

-- comprobante_archivo
SELECT COUNT(*) INTO @c2 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sch AND TABLE_NAME = 'caja_chica_ingresos' AND COLUMN_NAME = 'comprobante_archivo';

SET @prep2 = IF(@c2 = 0,
  'ALTER TABLE caja_chica_ingresos ADD COLUMN comprobante_archivo VARCHAR(255) NULL COMMENT ''Nombre archivo en uploads/caja-chica-ingresos/'' AFTER fecha_deposito',
  'SELECT 1');
PREPARE s2 FROM @prep2;
EXECUTE s2;
DEALLOCATE PREPARE s2;
