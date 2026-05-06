-- Importación desde Data Proyectos.xlsx
-- Sin consultores: asignar en la app (cp_proyecto_consultores) o por SQL.
-- Fecha fin vacía: estado Finalizado → misma fecha que inicio; En curso (u otro) → inicio + 1 año.
USE gestor_vacaciones;
SET NAMES utf8mb4;
INSERT INTO cp_proyectos (empresa, proyecto, fecha_inicio, fecha_fin, horas_asignadas, estado, detalles) VALUES
('Laboratorios Bago', 'Migración de tableros de control de MSTR a Power BI', '2025-10-06', '2025-10-06', 208.00, 'finalizado', 'El usuario Rodrigo Loayza debe de recibir de forma diaria su informe en formato PDF al correo rloayza@bagoperu.com.pe con copia a Ricardo Martinez'),
('Practical Action', 'Bolsa de Horas 1 - Modificaciones en los reportes de Power BI', '2025-10-13', '2025-10-13', 50.00, 'finalizado', 'Contrato-N°/CS-196/2025 Se estará reportando el consumo a Juan Manuel Peña Gonzales (juan.pena@practicalaction.org)'),
('Talent Hub (American Dream)', 'Plataforma para compra y venta de Roofing', '2025-10-06', '2026-10-06', 10.00, 'en_curso', 'El cliente debería de recibir un informe semanal en formato PDF, pero siendo primero revisado con Gerencia'),
('Prayaga Solutions', 'Control de Horas-Recursos Internos', '2025-10-21', '2026-10-21', 0.00, 'en_curso', 'Control de actividades a Mónica Carrasco'),
('CELEPSA', 'CELEPSA - Bolsa Horas Soporte Base Maestra RRHH 2025-26', '2025-07-23', '2026-07-22', 20.00, 'en_curso', 'O/S 4400417410 16/07/25. HE 1001933636. 22/07/25'),
('Prayaga Solutions', 'Tareas de Preventa', '2025-11-04', '2025-12-31', 50.00, 'en_curso', NULL),
('FOPESA', 'Tablero FOPESA en Power BI', '2025-10-20', '2025-10-20', 1.50, 'en_curso', NULL),
('SENATI', 'Tablero Power BI-SENATI (Proyecto por recurso contratado-Apoyo)', '2025-10-23', '2025-10-24', 9.75, 'finalizado', NULL),
('CELEPSA', 'CELEPSA - Bolsa Horas Soporte CMD 2025-26', '2025-11-20', '2026-11-19', 20.00, 'en_curso', 'O/C 4400450262 06/11/2025'),
('CELEPSA', 'CELEPSA - Capacitación / Asesoría CMD 2025-26', '2025-11-20', '2026-11-19', 24.00, 'en_curso', 'O/C 4400450262'),
('UARM', 'SOPORTE TECNICO DESARROLLOS 2026', '2026-01-09', '2027-01-08', 80.00, 'en_curso', NULL),
('Practical Action', 'Bolsa de Horas 2 - Enero 2026', '2025-12-01', '2026-12-01', 150.00, 'en_curso', 'Contrato-N°/CS-204/2026 horas 150'),
('PRIMA AFP', 'POWER BI - PRIMA AFP', '2026-02-24', '2026-03-08', 0.00, 'en_curso', NULL),
('TALENT HUB', 'TALENT HUB', '2026-02-01', '2026-04-15', 30.00, 'en_curso', NULL),
('Practical Action', 'Bolsa de Horas 3 - Feb 2026 Contrato-N°/CS-208/2026', '2026-01-28', '2027-01-28', 200.00, 'en_curso', NULL),
('Practical Action', 'Proyecto SUN', '2026-03-16', '2027-03-16', 100.00, 'en_curso', NULL);
