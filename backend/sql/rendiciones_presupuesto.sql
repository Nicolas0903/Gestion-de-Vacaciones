-- Rendiciones de presupuesto
-- Módulo paralelo a "solicitudes_reembolso" pero con un campo nuevo `area` (área
-- de la empresa que realizó el desembolso) y un flujo de aprobación que solo
-- ejecuta el rol admin (no hay aprobador configurable como en reembolsos).
-- La tabla es independiente para mantener la trazabilidad y los listados de
-- caja chica / reportes separados.
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
  archivo_recibo_generado_path VARCHAR(500) NULL COMMENT 'PDF generado si no adjuntó factura',
  metodo_reembolso ENUM('yape', 'plin', 'transferencia') NOT NULL,
  celular VARCHAR(30) NOT NULL,
  nombre_en_metodo VARCHAR(220) NOT NULL,
  numero_cuenta TEXT NULL COMMENT 'Cuenta o CCI si es transferencia',
  monto DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ruc_proveedor VARCHAR(32) NULL COMMENT 'Con comprobante: RUC del emisor',
  numero_documento VARCHAR(80) NULL COMMENT 'Con comprobante: N° de factura / documento',
  estado ENUM('pendiente', 'aprobado', 'rechazado', 'observado') NOT NULL DEFAULT 'pendiente',
  comentarios_resolucion TEXT NULL,
  aprobado_por INT NULL,
  fecha_resolucion TIMESTAMP NULL,
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
