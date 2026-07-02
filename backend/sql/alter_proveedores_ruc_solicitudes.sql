-- RUC en proveedores + solicitudes pendientes desde Rendición de Presupuesto
-- Ejecutar sobre gestor_vacaciones

ALTER TABLE proveedores
  ADD COLUMN ruc VARCHAR(11) NULL COMMENT 'RUC peruano (11 dígitos)' AFTER razon_social;

ALTER TABLE proveedores
  ADD UNIQUE INDEX uk_prov_ruc (ruc);

ALTER TABLE rendiciones_presupuesto
  ADD COLUMN proveedor_id INT NULL COMMENT 'Proveedor afiliado si el RUC existe' AFTER ruc_proveedor,
  ADD COLUMN proveedor_solicitud_id INT NULL COMMENT 'Solicitud pendiente si RUC no registrado' AFTER proveedor_id;

CREATE TABLE IF NOT EXISTS proveedor_solicitudes_pendientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(32) NOT NULL,
  ruc VARCHAR(11) NOT NULL,
  detalle TEXT NOT NULL,
  area_solicitante ENUM('operaciones', 'gerencia', 'administracion', 'comercial', 'marketing', 'otros') NOT NULL,
  area_otro VARCHAR(120) NULL,
  rendicion_presupuesto_id INT NULL,
  solicitante_id INT NOT NULL,
  estado ENUM('pendiente', 'en_evaluacion', 'completada', 'descartada') NOT NULL DEFAULT 'pendiente',
  evaluacion_id INT NULL,
  proveedor_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sol_codigo (codigo),
  INDEX idx_sol_estado (estado),
  INDEX idx_sol_ruc (ruc),
  INDEX idx_sol_rendicion (rendicion_presupuesto_id),
  FOREIGN KEY (rendicion_presupuesto_id) REFERENCES rendiciones_presupuesto(id) ON DELETE SET NULL,
  FOREIGN KEY (solicitante_id) REFERENCES empleados(id),
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_proveedor(id) ON DELETE SET NULL,
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE rendiciones_presupuesto
  ADD CONSTRAINT fk_rp_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_rp_prov_solicitud FOREIGN KEY (proveedor_solicitud_id) REFERENCES proveedor_solicitudes_pendientes(id) ON DELETE SET NULL;
