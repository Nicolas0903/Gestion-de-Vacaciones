-- =====================================================
-- SCHEMA PARA POSTGRESQL (RENDER.COM)
-- Gestor de Vacaciones - Prayaga
-- =====================================================

-- Eliminar tablas si existen (para desarrollo/pruebas)
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS aprobaciones CASCADE;
DROP TABLE IF EXISTS solicitudes_vacaciones CASCADE;
DROP TABLE IF EXISTS periodos_vacaciones CASCADE;
DROP TABLE IF EXISTS empleados CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =====================================================
-- TABLA: roles
-- =====================================================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA: empleados
-- =====================================================
CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fecha_ingreso DATE NOT NULL,
  cargo VARCHAR(100),
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  jefe_id INTEGER REFERENCES empleados(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para empleados
CREATE INDEX idx_empleados_email ON empleados(email);
CREATE INDEX idx_empleados_rol ON empleados(rol_id);
CREATE INDEX idx_empleados_jefe ON empleados(jefe_id);
CREATE INDEX idx_empleados_activo ON empleados(activo);

-- =====================================================
-- TABLA: periodos_vacaciones
-- =====================================================
CREATE TABLE periodos_vacaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_inicio_periodo DATE NOT NULL,
  fecha_fin_periodo DATE NOT NULL,
  dias_correspondientes INTEGER NOT NULL DEFAULT 0,
  dias_gozados INTEGER DEFAULT 0,
  dias_pendientes INTEGER GENERATED ALWAYS AS (dias_correspondientes - dias_gozados) STORED,
  estado VARCHAR(20) DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dias_positivos CHECK (dias_correspondientes >= 0 AND dias_gozados >= 0),
  CONSTRAINT chk_estado CHECK (estado IN ('pendiente', 'parcial', 'gozadas'))
);

-- Índices para periodos_vacaciones
CREATE INDEX idx_periodos_empleado ON periodos_vacaciones(empleado_id);
CREATE INDEX idx_periodos_estado ON periodos_vacaciones(estado);

-- =====================================================
-- TABLA: solicitudes_vacaciones
-- =====================================================
CREATE TABLE solicitudes_vacaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo_id INTEGER NOT NULL REFERENCES periodos_vacaciones(id) ON DELETE CASCADE,
  fecha_inicio_vacaciones DATE NOT NULL,
  fecha_fin_vacaciones DATE NOT NULL,
  dias_solicitados INTEGER NOT NULL,
  motivo TEXT,
  estado VARCHAR(20) DEFAULT 'borrador',
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dias_solicitados CHECK (dias_solicitados > 0),
  CONSTRAINT chk_fechas CHECK (fecha_fin_vacaciones >= fecha_inicio_vacaciones),
  CONSTRAINT chk_estado_solicitud CHECK (estado IN ('borrador', 'enviada', 'pendiente', 'aprobada', 'rechazada', 'cancelada'))
);

-- Índices para solicitudes_vacaciones
CREATE INDEX idx_solicitudes_empleado ON solicitudes_vacaciones(empleado_id);
CREATE INDEX idx_solicitudes_periodo ON solicitudes_vacaciones(periodo_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes_vacaciones(estado);
CREATE INDEX idx_solicitudes_fechas ON solicitudes_vacaciones(fecha_inicio_vacaciones, fecha_fin_vacaciones);

-- =====================================================
-- TABLA: aprobaciones
-- =====================================================
CREATE TABLE aprobaciones (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes_vacaciones(id) ON DELETE CASCADE,
  aprobador_id INTEGER NOT NULL REFERENCES empleados(id),
  fecha_aprobacion TIMESTAMP,
  estado VARCHAR(20) DEFAULT 'pendiente',
  comentarios TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_estado_aprobacion CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'))
);

-- Índices para aprobaciones
CREATE INDEX idx_aprobaciones_solicitud ON aprobaciones(solicitud_id);
CREATE INDEX idx_aprobaciones_aprobador ON aprobaciones(aprobador_id);
CREATE INDEX idx_aprobaciones_estado ON aprobaciones(estado);

-- =====================================================
-- TABLA: notificaciones
-- =====================================================
CREATE TABLE notificaciones (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para notificaciones
CREATE INDEX idx_notificaciones_empleado ON notificaciones(empleado_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);

-- =====================================================
-- DATOS INICIALES: Roles
-- =====================================================
INSERT INTO roles (nombre, descripcion) VALUES
('admin', 'Administrador del sistema'),
('contadora', 'Contadora - Gestión de vacaciones'),
('gerente_general', 'Gerente General'),
('gerente_consultoria', 'Gerente de Consultoría'),
('jefe_operaciones', 'Jefe de Operaciones'),
('analista_senior', 'Analista Senior - Marketing'),
('consultor', 'Consultor'),
('contador', 'Contador'),
('comercial', 'Comercial'),
('practicante', 'Practicante'),
('empleado', 'Empleado general');

-- =====================================================
-- DATOS INICIALES: Usuario Administrador
-- =====================================================
-- Password: admin123 (bcrypt hash)
INSERT INTO empleados (nombres, apellidos, email, password, fecha_ingreso, cargo, rol_id) 
VALUES ('Admin', 'Sistema', 'admin@prayaga.com', 
        '$2a$10$Xh6/9.qvqrH9qKVLZqKx0uN8bZQqVXrQqZqGvVzQxVqRqZqKx0uN8', 
        '2024-01-01', 'Administrador del Sistema', 1);

-- =====================================================
-- FUNCIONES AUXILIARES (Opcional)
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_empleados_updated_at BEFORE UPDATE ON empleados
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_periodos_updated_at BEFORE UPDATE ON periodos_vacaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_solicitudes_updated_at BEFORE UPDATE ON solicitudes_vacaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================

-- Verificar tablas creadas
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar roles insertados
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_usuarios FROM empleados;
