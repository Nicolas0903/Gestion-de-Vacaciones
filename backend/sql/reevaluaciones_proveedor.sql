-- Reevaluación de proveedores (registros vinculados a la lista de proveedores)
-- Ejecutar sobre gestor_vacaciones después de proveedores.sql

CREATE TABLE IF NOT EXISTS reevaluaciones_proveedor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  proveedor_id INT NOT NULL,
  producto_servicio VARCHAR(500) NOT NULL,
  criterio_seleccion ENUM('historico', 'unico', 'evaluado') NOT NULL DEFAULT 'historico',
  fecha_ultima_interaccion DATE NULL,
  conformidad ENUM('si', 'no') NOT NULL DEFAULT 'si',
  fecha_revaluacion DATE NOT NULL,
  puntaje_habido TINYINT NOT NULL COMMENT '10 o 0',
  puntaje_entrega_efectiva TINYINT NOT NULL COMMENT '0 a 10',
  puntaje_precio_mercado TINYINT NOT NULL COMMENT '0 o 5',
  proxima_revaluacion DATE NULL,
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reeval_prov (proveedor_id),
  INDEX idx_reeval_fecha (fecha_revaluacion),
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
  FOREIGN KEY (creado_por) REFERENCES empleados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
