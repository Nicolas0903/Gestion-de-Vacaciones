-- =====================================================
-- GESTOR DE VACACIONES - PRAYAGA
-- Esquema de Base de Datos MySQL
-- =====================================================

CREATE DATABASE IF NOT EXISTS gestor_vacaciones;
USE gestor_vacaciones;

-- Tabla de Roles
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    nivel_aprobacion INT DEFAULT 0, -- 0: sin aprobación, 1: jefe, 2: contadora, 3: admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Empleados/Usuarios
CREATE TABLE empleados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo_empleado VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dni VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    fecha_ingreso DATE NOT NULL,
    rol_id INT NOT NULL,
    jefe_id INT NULL, -- Referencia al jefe directo
    activo BOOLEAN DEFAULT TRUE,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id),
    FOREIGN KEY (jefe_id) REFERENCES empleados(id)
);

-- Tabla de Períodos de Vacaciones (acumulación anual)
CREATE TABLE periodos_vacaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    fecha_inicio_periodo DATE NOT NULL,
    fecha_fin_periodo DATE NOT NULL,
    dias_correspondientes INT DEFAULT 30, -- Días que corresponden por ley
    dias_gozados INT DEFAULT 0,
    dias_pendientes INT GENERATED ALWAYS AS (dias_correspondientes - dias_gozados) STORED,
    tiempo_trabajado VARCHAR(50), -- Ej: "12 meses"
    estado ENUM('pendiente', 'parcial', 'gozadas') DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

-- Tabla de Solicitudes de Vacaciones
CREATE TABLE solicitudes_vacaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    periodo_id INT NOT NULL, -- Período del cual se toman los días
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_inicio_vacaciones DATE NOT NULL,
    fecha_fin_vacaciones DATE NOT NULL,
    dias_solicitados INT NOT NULL,
    fecha_efectiva_salida DATE,
    fecha_efectiva_regreso DATE,
    observaciones TEXT,
    estado ENUM('borrador', 'pendiente_jefe', 'pendiente_contadora', 'aprobada', 'rechazada', 'cancelada') DEFAULT 'borrador',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (periodo_id) REFERENCES periodos_vacaciones(id)
);

-- Tabla de Aprobaciones (historial de flujo)
CREATE TABLE aprobaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    aprobador_id INT NOT NULL,
    tipo_aprobacion ENUM('jefe', 'contadora', 'admin') NOT NULL,
    estado ENUM('pendiente', 'aprobado', 'rechazado') DEFAULT 'pendiente',
    comentarios TEXT,
    fecha_accion TIMESTAMP NULL,
    firma_digital VARCHAR(255), -- Ruta a imagen de firma o hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_vacaciones(id),
    FOREIGN KEY (aprobador_id) REFERENCES empleados(id)
);

-- Tabla de Notificaciones
CREATE TABLE notificaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    leida BOOLEAN DEFAULT FALSE,
    enlace VARCHAR(255), -- URL relacionada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

-- Tabla de Configuración del Sistema
CREATE TABLE configuracion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    descripcion VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Historial de Vacaciones (registro cuando se completan)
CREATE TABLE historial_vacaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    solicitud_id INT NOT NULL,
    fecha_salida DATE NOT NULL,
    fecha_retorno DATE NOT NULL,
    dias_tomados INT NOT NULL,
    periodo_aplicado VARCHAR(50), -- Ej: "2024-2025"
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_vacaciones(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_empleado_codigo ON empleados(codigo_empleado);
CREATE INDEX idx_empleado_email ON empleados(email);
CREATE INDEX idx_solicitud_estado ON solicitudes_vacaciones(estado);
CREATE INDEX idx_solicitud_empleado ON solicitudes_vacaciones(empleado_id);
CREATE INDEX idx_notificacion_empleado ON notificaciones(empleado_id, leida);
CREATE INDEX idx_periodo_empleado ON periodos_vacaciones(empleado_id);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar Roles
INSERT INTO roles (nombre, descripcion, nivel_aprobacion) VALUES
('admin', 'Administrador del sistema', 3),
('contadora', 'Contadora - Aprobación final', 2),
('jefe_operaciones', 'Jefe de Operaciones - Primera aprobación', 1),
('empleado', 'Empleado regular', 0),
('practicante', 'Practicante', 0);

-- Configuración inicial
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('dias_vacaciones_anuales', '30', 'Días de vacaciones por año trabajado'),
('dias_minimos_anticipacion', '15', 'Días mínimos de anticipación para solicitar'),
('empresa_nombre', 'PRAYAGA', 'Nombre de la empresa'),
('empresa_logo', '/images/logo-prayaga.png', 'Ruta del logo de la empresa');

-- Usuario Admin por defecto (password: admin123)
INSERT INTO empleados (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id) VALUES
('ADMIN001', 'Administrador', 'Sistema', '00000000', 'admin@prayaga.com', '$2b$10$xPPKzrLsGv8jvZqVvVBnZeYHqOyXqvGe6XB.yVfDqZXDJKBgF0Z8S', 'Administrador', '2020-01-01', 1);


