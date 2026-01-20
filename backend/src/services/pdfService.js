const PDFDocument = require('pdfkit');
const moment = require('moment');
require('moment/locale/es');
const path = require('path');
const fs = require('fs');

// Configurar moment en español
moment.locale('es');

class PDFService {
  static generarSolicitudVacaciones(solicitud, aprobaciones = []) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // ==========================================
        // ENCABEZADO CON LOGO
        // ==========================================
        const logoPath = path.join(__dirname, '../assets/logo.png');
        const logoExists = fs.existsSync(logoPath);

        if (logoExists) {
          // Logo más grande y centrado
          doc.image(logoPath, 50, 30, { width: 120 });
          
          // Solo "Gestión de Vacaciones" al lado del logo
          doc.fontSize(11).font('Helvetica')
             .fillColor('#64748b')
             .text('Gestión de Vacaciones', 180, 75);
          
          doc.y = 115;
        } else {
          // Si no existe el logo, creamos un encabezado con iniciales estilizadas
          doc.rect(50, 40, 60, 60).fill('#0d9488');
          doc.fontSize(36).font('Helvetica-Bold')
             .fillColor('#ffffff')
             .text('P', 67, 52);
          
          doc.fontSize(24).font('Helvetica-Bold')
             .fillColor('#0d9488')
             .text('PRAYAGA', 125, 50);
          
          doc.fontSize(11).font('Helvetica')
             .fillColor('#64748b')
             .text('Gestión de Vacaciones', 125, 78);
          
          doc.y = 115;
        }

        doc.moveDown(0.5);
        
        // Título del documento
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text('SOLICITUD DE VACACIONES', { align: 'center' });
        
        // Número de solicitud
        doc.fontSize(10).font('Helvetica')
           .fillColor('#64748b')
           .text(`N° ${String(solicitud.id).padStart(6, '0')}`, { align: 'center' });

        doc.moveDown(1);

        // Línea separadora decorativa
        const lineY = doc.y;
        doc.rect(50, lineY, 495, 3).fill('#0d9488');

        doc.moveDown(1.5);

        // ==========================================
        // DATOS DEL EMPLEADO
        // ==========================================
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#0d9488')
           .text('Datos del Empleado', 50);
        
        doc.moveDown(0.5);
        
        const empleadoY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b');
        
        // Encabezados de tabla
        doc.rect(50, empleadoY, 120, 22).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.rect(170, empleadoY, 150, 22).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.rect(320, empleadoY, 80, 22).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.rect(400, empleadoY, 145, 22).fillAndStroke('#f1f5f9', '#e2e8f0');

        doc.fillColor('#475569')
           .text('Código', 55, empleadoY + 6, { width: 110 })
           .text('Nombres y Apellidos', 175, empleadoY + 6, { width: 140 })
           .text('DNI', 325, empleadoY + 6, { width: 70 })
           .text('Cargo', 405, empleadoY + 6, { width: 135 });

        // Datos
        const datosY = empleadoY + 22;
        doc.rect(50, datosY, 120, 28).stroke('#e2e8f0');
        doc.rect(170, datosY, 150, 28).stroke('#e2e8f0');
        doc.rect(320, datosY, 80, 28).stroke('#e2e8f0');
        doc.rect(400, datosY, 145, 28).stroke('#e2e8f0');

        doc.font('Helvetica').fillColor('#1e293b')
           .text(solicitud.codigo_empleado || '', 55, datosY + 9, { width: 110 })
           .text(`${solicitud.nombres} ${solicitud.apellidos}`, 175, datosY + 9, { width: 140 })
           .text(solicitud.dni || '', 325, datosY + 9, { width: 70 })
           .text(solicitud.cargo || '', 405, datosY + 9, { width: 135 });

        doc.y = datosY + 45;

        // ==========================================
        // INFORMACIÓN SOBRE VACACIONES
        // ==========================================
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#0d9488')
           .text('Información Sobre Vacaciones', 50);
        
        doc.moveDown(0.5);

        const vacY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');

        // Encabezados con colores más modernos
        doc.rect(50, vacY, 130, 22).fillAndStroke('#fef3c7', '#fcd34d');
        doc.rect(180, vacY, 70, 22).fillAndStroke('#fef3c7', '#fcd34d');
        doc.rect(250, vacY, 140, 22).fillAndStroke('#fef3c7', '#fcd34d');
        doc.rect(390, vacY, 155, 22).fillAndStroke('#fef3c7', '#fcd34d');

        doc.fillColor('#92400e')
           .text('Período Laboral', 55, vacY + 6, { width: 120 })
           .text('Días Pend.', 185, vacY + 6, { width: 60 })
           .text('Fechas de Vacaciones', 255, vacY + 6, { width: 130 })
           .text('Días Solicitados', 395, vacY + 6, { width: 145 });

        // Datos de vacaciones
        const vacDatosY = vacY + 22;
        doc.rect(50, vacDatosY, 130, 28).stroke('#e2e8f0');
        doc.rect(180, vacDatosY, 70, 28).stroke('#e2e8f0');
        doc.rect(250, vacDatosY, 140, 28).stroke('#e2e8f0');
        doc.rect(390, vacDatosY, 155, 28).stroke('#e2e8f0');

        const periodoTexto = `${moment(solicitud.fecha_inicio_periodo).format('DD/MM/YYYY')} - ${moment(solicitud.fecha_fin_periodo).format('DD/MM/YYYY')}`;
        const vacacionesTexto = `${moment(solicitud.fecha_inicio_vacaciones).format('DD/MM/YYYY')} - ${moment(solicitud.fecha_fin_vacaciones).format('DD/MM/YYYY')}`;

        doc.font('Helvetica').fillColor('#1e293b')
           .text(periodoTexto, 55, vacDatosY + 9, { width: 120 })
           .text(String(solicitud.dias_pendientes_periodo || ''), 185, vacDatosY + 9, { width: 60, align: 'center' })
           .text(vacacionesTexto, 255, vacDatosY + 9, { width: 130 })
           .text(String(solicitud.dias_solicitados), 395, vacDatosY + 9, { width: 145, align: 'center' });

        doc.y = vacDatosY + 45;

        // Fechas efectivas en recuadros
        const fechasY = doc.y;
        doc.rect(50, fechasY, 240, 35).fillAndStroke('#f0fdfa', '#99f6e4');
        doc.rect(305, fechasY, 240, 35).fillAndStroke('#f0fdfa', '#99f6e4');

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0d9488')
           .text('Fecha Efectiva de Salida', 60, fechasY + 5);
        doc.font('Helvetica').fillColor('#1e293b')
           .text(moment(solicitud.fecha_efectiva_salida || solicitud.fecha_inicio_vacaciones).format('dddd, DD [de] MMMM [de] YYYY'), 60, fechasY + 18);

        doc.font('Helvetica-Bold').fillColor('#0d9488')
           .text('Fecha Efectiva de Regreso', 315, fechasY + 5);
        doc.font('Helvetica').fillColor('#1e293b')
           .text(moment(solicitud.fecha_efectiva_regreso || solicitud.fecha_fin_vacaciones).format('dddd, DD [de] MMMM [de] YYYY'), 315, fechasY + 18);

        doc.y = fechasY + 50;

        // ==========================================
        // OBSERVACIONES
        // ==========================================
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#0d9488')
           .text('Observaciones', 50);
        doc.moveDown(0.3);
        
        const obsY = doc.y;
        doc.rect(50, obsY, 495, 50).stroke('#e2e8f0');
        doc.fontSize(10).font('Helvetica').fillColor('#475569')
           .text(solicitud.observaciones || 'Sin observaciones', 60, obsY + 10, { width: 475 });

        doc.y = obsY + 65;

        // Línea separadora
        doc.rect(50, doc.y, 495, 2).fill('#e2e8f0');
        doc.moveDown(1);

        // ==========================================
        // PROCESO DE APROBACIÓN
        // ==========================================
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#0d9488')
           .text('Proceso de Aprobación', 50);
        
        doc.moveDown(0.5);

        const aprobY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');

        // Tres columnas para aprobación con colores más modernos
        doc.rect(50, aprobY, 165, 24).fillAndStroke('#dbeafe', '#93c5fd');
        doc.rect(215, aprobY, 165, 24).fillAndStroke('#dcfce7', '#86efac');
        doc.rect(380, aprobY, 165, 24).fillAndStroke('#fee2e2', '#fca5a5');

        doc.fillColor('#1e40af').text('Solicitado Por', 55, aprobY + 7, { width: 155 });
        doc.fillColor('#166534').text('Aprobado Por (Jefe)', 220, aprobY + 7, { width: 155 });
        doc.fillColor('#991b1b').text('Recibido Por (RRHH)', 385, aprobY + 7, { width: 155 });

        // Datos de aprobación
        const aprobDatosY = aprobY + 24;
        doc.rect(50, aprobDatosY, 165, 85).stroke('#e2e8f0');
        doc.rect(215, aprobDatosY, 165, 85).stroke('#e2e8f0');
        doc.rect(380, aprobDatosY, 165, 85).stroke('#e2e8f0');

        doc.fillColor('#1e293b');

        // Solicitado por (empleado)
        doc.font('Helvetica-Bold').fontSize(9).text('Nombre:', 55, aprobDatosY + 8);
        doc.font('Helvetica').text(`${solicitud.nombres} ${solicitud.apellidos}`, 95, aprobDatosY + 8, { width: 115 });
        doc.font('Helvetica-Bold').text('Cargo:', 55, aprobDatosY + 24);
        doc.font('Helvetica').text(solicitud.cargo || '', 85, aprobDatosY + 24, { width: 125 });
        doc.font('Helvetica-Bold').text('Fecha:', 55, aprobDatosY + 40);
        doc.font('Helvetica').text(moment(solicitud.created_at).format('DD/MM/YYYY'), 85, aprobDatosY + 40);
        doc.font('Helvetica-Bold').text('Firma:', 55, aprobDatosY + 56);
        doc.rect(55, aprobDatosY + 68, 100, 1).stroke('#94a3b8');

        // Aprobado por (jefe)
        const aprobacionJefe = aprobaciones.find(a => a.tipo_aprobacion === 'jefe');
        doc.font('Helvetica-Bold').text('Nombre:', 220, aprobDatosY + 8);
        doc.font('Helvetica').text(aprobacionJefe ? `${aprobacionJefe.aprobador_nombres} ${aprobacionJefe.aprobador_apellidos}` : '________________', 260, aprobDatosY + 8, { width: 115 });
        doc.font('Helvetica-Bold').text('Cargo:', 220, aprobDatosY + 24);
        doc.font('Helvetica').text(aprobacionJefe?.aprobador_cargo || 'Jefe de Operaciones', 250, aprobDatosY + 24, { width: 125 });
        doc.font('Helvetica-Bold').text('Fecha:', 220, aprobDatosY + 40);
        doc.font('Helvetica').text(aprobacionJefe?.fecha_accion ? moment(aprobacionJefe.fecha_accion).format('DD/MM/YYYY') : '____/____/____', 250, aprobDatosY + 40);
        doc.font('Helvetica-Bold').text('Firma:', 220, aprobDatosY + 56);
        doc.rect(220, aprobDatosY + 68, 100, 1).stroke('#94a3b8');

        // Recibido por (contadora)
        const aprobacionContadora = aprobaciones.find(a => a.tipo_aprobacion === 'contadora');
        doc.font('Helvetica-Bold').text('Nombre:', 385, aprobDatosY + 8);
        doc.font('Helvetica').text(aprobacionContadora ? `${aprobacionContadora.aprobador_nombres} ${aprobacionContadora.aprobador_apellidos}` : '________________', 425, aprobDatosY + 8, { width: 115 });
        doc.font('Helvetica-Bold').text('Cargo:', 385, aprobDatosY + 24);
        doc.font('Helvetica').text(aprobacionContadora?.aprobador_cargo || 'Contadora', 415, aprobDatosY + 24, { width: 125 });
        doc.font('Helvetica-Bold').text('Fecha:', 385, aprobDatosY + 40);
        doc.font('Helvetica').text(aprobacionContadora?.fecha_accion ? moment(aprobacionContadora.fecha_accion).format('DD/MM/YYYY') : '____/____/____', 415, aprobDatosY + 40);
        doc.font('Helvetica-Bold').text('Firma:', 385, aprobDatosY + 56);
        doc.rect(385, aprobDatosY + 68, 100, 1).stroke('#94a3b8');

        // ==========================================
        // PIE DE PÁGINA
        // ==========================================
        doc.fontSize(8).fillColor('#94a3b8')
           .text(`Documento generado el ${moment().format('DD/MM/YYYY [a las] HH:mm')} | PRAYAGA - Sistema de Gestion de Vacaciones`, 50, 770, { align: 'center', width: 495 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFService;
