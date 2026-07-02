-- =============================================================================
-- Setup completo Rendición de Presupuesto (producción)
-- Ejecutar: mysql -u root -p gestor_vacaciones < backend/sql/setup_rendiciones_presupuesto_produccion.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS rendiciones_presupuesto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  empleado_id INT NOT NULL,
  fecha_solicitud_usuario DATE NOT NULL COMMENT 'Fecha del recibo indicada por el usuario',
  area ENUM(
    'gerencia_general',
    'consultoria',
    'administracion',
    'operaciones',
    'marketing',
    'comercial'
  ) NOT NULL COMMENT 'Área de la empresa que realizó el consumo',
  concepto TEXT NOT NULL,
  nombre_completo VARCHAR(220) NOT NULL,
  dni VARCHAR(15) NOT NULL,
  tiene_comprobante BOOLEAN NOT NULL DEFAULT FALSE,
  archivo_comprobante_nombre VARCHAR(255) NULL,
  archivo_comprobante_path VARCHAR(500) NULL,
  archivo_recibo_generado_path VARCHAR(500) NULL,
  monto DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN',
  ruc_proveedor VARCHAR(32) NULL,
  numero_documento VARCHAR(80) NULL,
  estado ENUM('pendiente', 'aprobado', 'rechazado', 'observado') NOT NULL DEFAULT 'pendiente',
  comentarios_resolucion TEXT NULL,
  aprobado_por INT NULL,
  fecha_resolucion TIMESTAMP NULL,
  fecha_deposito DATE NULL,
  monto_deposito DECIMAL(12, 2) NULL,
  comprobante_deposito_nombre VARCHAR(255) NULL,
  comprobante_deposito_path VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobado_por) REFERENCES empleados(id),
  INDEX idx_rp_empleado (empleado_id),
  INDEX idx_rp_estado (estado),
  INDEX idx_rp_area (area)
);

CREATE TABLE IF NOT EXISTS tokens_rendicion_presupuesto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(64) NOT NULL UNIQUE,
  rendicion_id INT NOT NULL,
  aprobador_id INT NOT NULL,
  accion ENUM('aprobar', 'rechazar') NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  usado_en TIMESTAMP NULL,
  expira_en TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rendicion_id) REFERENCES rendiciones_presupuesto(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobador_id) REFERENCES empleados(id),
  INDEX idx_trp_token (token),
  INDEX idx_trp_rendicion (rendicion_id)
);

CREATE TABLE IF NOT EXISTS rendicion_caja_periodos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  mes INT NOT NULL,
  estado ENUM('borrador', 'cerrado') NOT NULL DEFAULT 'borrador',
  total_cierre DECIMAL(12, 2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rendicion_caja_anio_mes (anio, mes)
);

-- Si la tabla ya existía sin columnas nuevas, agregarlas (ignorar error "Duplicate column"):
SET @db = DATABASE();

SELECT COUNT(*) INTO @col_moneda FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'moneda';
SET @sql_moneda = IF(@col_moneda = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN moneda ENUM(''PEN'', ''USD'') NOT NULL DEFAULT ''PEN'' AFTER monto',
  'SELECT 1');
PREPARE stmt FROM @sql_moneda; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_area FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'area';
SET @sql_area = IF(@col_area = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN area ENUM(''gerencia_general'',''consultoria'',''administracion'',''operaciones'',''marketing'',''comercial'') NOT NULL DEFAULT ''administracion'' AFTER fecha_solicitud_usuario',
  'SELECT 1');
PREPARE stmt FROM @sql_area; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_fd FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'fecha_deposito';
SET @sql_fd = IF(@col_fd = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN fecha_deposito DATE NULL AFTER monto',
  'SELECT 1');
PREPARE stmt FROM @sql_fd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_md FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'monto_deposito';
SET @sql_md = IF(@col_md = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN monto_deposito DECIMAL(12,2) NULL AFTER fecha_deposito',
  'SELECT 1');
PREPARE stmt FROM @sql_md; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_cdn FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'comprobante_deposito_nombre';
SET @sql_cdn = IF(@col_cdn = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN comprobante_deposito_nombre VARCHAR(255) NULL AFTER monto_deposito',
  'SELECT 1');
PREPARE stmt FROM @sql_cdn; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_cdp FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rendiciones_presupuesto' AND COLUMN_NAME = 'comprobante_deposito_path';
SET @sql_cdp = IF(@col_cdp = 0,
  'ALTER TABLE rendiciones_presupuesto ADD COLUMN comprobante_deposito_path VARCHAR(500) NULL AFTER comprobante_deposito_nombre',
  'SELECT 1');
PREPARE stmt FROM @sql_cdp; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'rendiciones_presupuesto OK' AS status;
