-- Módulo Gestión de Proveedores (lista + evaluación/selección)
-- Ejecutar sobre gestor_vacaciones

CREATE TABLE IF NOT EXISTS evaluaciones_proveedor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fecha DATE NOT NULL,
  oc_asociada ENUM('si', 'no') NOT NULL DEFAULT 'no',
  detalle TEXT NOT NULL,
  estado ENUM('borrador', 'cerrada') NOT NULL DEFAULT 'borrador',
  candidato_ganador_id INT NULL COMMENT 'Candidato con mayor puntaje al cerrar',
  proveedor_registrado_id INT NULL COMMENT 'Proveedor creado en lista desde el ganador',
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_eval_prov_fecha (fecha),
  INDEX idx_eval_prov_estado (estado),
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluacion_proveedor_candidatos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  evaluacion_id INT NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  direccion VARCHAR(500) NULL,
  cumplimiento_legal ENUM('si', 'no', 'na') NOT NULL DEFAULT 'na',
  puntaje_experiencia TINYINT NOT NULL COMMENT '10, 20 o 30',
  puntaje_precio TINYINT NOT NULL COMMENT '10, 20 o 30',
  puntaje_iso TINYINT NOT NULL COMMENT '10, 20 o 30',
  puntaje_valor_agregado TINYINT NOT NULL COMMENT '0 a 10',
  obs_experiencia VARCHAR(500) NULL,
  obs_precio VARCHAR(500) NULL,
  obs_iso VARCHAR(500) NULL,
  obs_valor_agregado VARCHAR(500) NULL,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cand_eval (evaluacion_id),
  FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones_proveedor(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proveedores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  razon_social VARCHAR(255) NOT NULL,
  tipo_proveedor ENUM('merchandising', 'servidor', 'dispensador_agua', 'microsoft', 'otros') NOT NULL,
  tipo_proveedor_otro VARCHAR(120) NULL,
  website VARCHAR(500) NULL,
  fecha_registro DATE NOT NULL,
  area_solicitante ENUM('operaciones', 'gerencia', 'administracion', 'comercial', 'marketing', 'otros') NOT NULL,
  area_otro VARCHAR(120) NULL,
  producto_servicio VARCHAR(500) NOT NULL,
  contacto_prayaga VARCHAR(200) NOT NULL,
  nombre_contacto_proveedor VARCHAR(200) NULL,
  datos_proveedor TEXT NULL,
  evaluacion_origen_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_prov_razon (razon_social),
  INDEX idx_prov_tipo (tipo_proveedor),
  INDEX idx_prov_eval_origen (evaluacion_origen_id),
  FOREIGN KEY (evaluacion_origen_id) REFERENCES evaluaciones_proveedor(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE evaluaciones_proveedor
  ADD CONSTRAINT fk_eval_candidato_ganador
    FOREIGN KEY (candidato_ganador_id) REFERENCES evaluacion_proveedor_candidatos(id) ON DELETE SET NULL;

ALTER TABLE evaluaciones_proveedor
  ADD CONSTRAINT fk_eval_proveedor_registrado
    FOREIGN KEY (proveedor_registrado_id) REFERENCES proveedores(id) ON DELETE SET NULL;
