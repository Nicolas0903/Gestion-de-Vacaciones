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
           .text('SOLICITUD DE VACACIONES', 50, doc.y, { align: 'center', width: 495 });
        
        doc.moveDown(0.5);
        
        // Número de solicitud
        doc.fontSize(10).font('Helvetica')
           .fillColor('#64748b')
           .text(`N° ${String(solicitud.id).padStart(6, '0')}`, 50, doc.y, { align: 'center', width: 495 });

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
        doc.fillColor('#166534').text('Aprobado Por', 220, aprobY + 7, { width: 155 });
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

        // Aprobado por (jefe directo si existe, sino queda vacío)
        const aprobacionJefe = aprobaciones.find(a => a.tipo_aprobacion === 'jefe');
        doc.font('Helvetica-Bold').text('Nombre:', 220, aprobDatosY + 8);
        doc.font('Helvetica').text(aprobacionJefe ? `${aprobacionJefe.aprobador_nombres} ${aprobacionJefe.aprobador_apellidos}` : '________________', 260, aprobDatosY + 8, { width: 115 });
        doc.font('Helvetica-Bold').text('Cargo:', 220, aprobDatosY + 24);
        doc.font('Helvetica').text(aprobacionJefe?.aprobador_cargo || '________________', 250, aprobDatosY + 24, { width: 125 });
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

  /**
   * Recibo estilo plantilla Prayaga (sin factura adjunta).
   * @param {Object} r - Fila solicitudes_reembolso + codigo_ticket (string)
   */
  static generarReciboReembolso(r) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 48, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const pageW = 595.28;
        const margin = 48;
        const contentW = pageW - margin * 2;
        let y = margin;

        const logoPath = path.join(__dirname, '../assets/logo.png');
        const logoExists = fs.existsSync(logoPath);
        const headerH = 72;

        if (logoExists) {
          doc.image(logoPath, margin, y, { width: 100 });
        } else {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0d9488').text('PRAYAGA', margin, y + 8);
        }

        doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000')
          .text('Recibo', margin, y + 20, { width: contentW, align: 'center' });

        const yTicket = y + 46;
        const codigoTicket =
          (r.codigo_ticket && String(r.codigo_ticket).trim()) ||
          (r.id && r.created_at
            ? `RMB-${new Date(r.created_at).getFullYear()}-${String(r.id).padStart(5, '0')}`
            : '');
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
          .text(`ID de ticket: ${codigoTicket || '—'}`, margin, yTicket, { width: contentW, align: 'center' });

        const monto = Number(r.monto) || 0;
        const montoTxt = `S/ ${monto.toFixed(2)}`;
        const boxW = 100;
        doc.rect(pageW - margin - boxW, y, boxW, 36).stroke('#000000');
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
          .text(montoTxt, pageW - margin - boxW, y + 12, { width: boxW, align: 'center' });

        y += headerH + 34;

        const fechaUser = r.fecha_solicitud_usuario
          ? moment(r.fecha_solicitud_usuario).format('DD/MM/YYYY')
          : '—';

        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        doc.text('Recibí de Prayaga Solutions S.A.C', margin, y, { width: contentW * 0.55, align: 'left' });
        doc.text(`Fecha: ${fechaUser}`, margin, y, { width: contentW, align: 'right' });
        y += 28;

        doc.text('Concepto de', margin, y);
        const lineY = y + 16;
        doc.moveTo(margin + 72, lineY).lineTo(margin + contentW, lineY).stroke('#000000');
        doc.font('Helvetica').text(r.concepto || '', margin + 74, y - 2, { width: contentW - 76 });

        y = lineY + 120;
        const pieW = 240;
        const pieX = pageW - margin - pieW;
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        doc.text(`Nombre Completo: ${r.nombre_completo || ''}`, pieX, y, { width: pieW, align: 'right' });
        doc.text(`DNI: ${r.dni || ''}`, pieX, y + 18, { width: pieW, align: 'right' });

        const pieTicket = codigoTicket || (r.codigo_ticket || '');
        doc.fontSize(8).fillColor('#64748b')
          .text(
            `Ticket: ${pieTicket || '—'} · Registro solicitud: ${r.created_at ? moment(r.created_at).format('DD/MM/YYYY HH:mm') : '—'}`,
            margin,
            750,
            { width: contentW, align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * PDF formal del resumen de caja chica (correo a contadora).
   */
  static generarResumenCajaChicaFormal({
    periodoEtiqueta,
    estadoPeriodo,
    saldoCierreGuardado,
    rangoDesde,
    rangoHasta,
    ingresos,
    egresos,
    totales,
    enviadoPorNombre
  }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 48, size: 'A4' });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const pageW = 595.28;
        const margin = 48;
        const contentW = pageW - margin * 2;
        let y = margin;

        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, y, { width: 88 });
        } else {
          doc.fontSize(13).font('Helvetica-Bold').fillColor('#0d9488').text('PRAYAGA', margin, y + 10);
        }
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
          .text('Portal RRHH · Módulo Caja chica', margin + 96, y + 18);
        y += 68;

        doc.fontSize(15).font('Helvetica-Bold').fillColor('#0f172a')
          .text('RESUMEN DE CAJA CHICA', margin, y, { width: contentW, align: 'center' });
        y += 22;
        doc.fontSize(10).font('Helvetica').fillColor('#334155');
        doc.text(`Período: ${periodoEtiqueta}`, margin, y);
        doc.text(`Estado: ${estadoPeriodo}`, margin + 220, y);
        y += 14;
        doc.text(`Rango fechas documento (egresos): ${rangoDesde} al ${rangoHasta}`, margin, y, { width: contentW });
        y += 14;
        if (saldoCierreGuardado != null && saldoCierreGuardado !== '') {
          doc.text(`Saldo de cierre registrado: S/ ${Number(saldoCierreGuardado).toFixed(2)}`, margin, y);
          y += 14;
        }
        doc.fontSize(9).fillColor('#64748b')
          .text(
            `Emitido para uso contable · Generado por: ${enviadoPorNombre || '—'} · ${moment().format('DD/MM/YYYY HH:mm')}`,
            margin,
            y,
            { width: contentW }
          );
        y += 22;

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0d9488').text('Ingresos del período', margin, y);
        y += 14;
        const ingPad = 6;
        const ingColMontoW = 102;
        const ingXMonto = margin + contentW - ingPad - ingColMontoW;
        const ingColMotivoW = ingXMonto - ingPad - (margin + ingPad);
        doc.rect(margin, y, contentW, 15).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569')
          .text('Motivo / transferencia', margin + ingPad, y + 4, { width: ingColMotivoW })
          .text('Monto (S/)', ingXMonto, y + 4, { width: ingColMontoW, align: 'right' });
        y += 16;
        for (const row of ingresos || []) {
          if (y > 730) {
            doc.addPage();
            y = margin;
          }
          doc.rect(margin, y, contentW, 14).stroke('#e2e8f0');
          doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
            .text(String(row.motivo_label || '—'), margin + ingPad, y + 3, { width: ingColMotivoW })
            .text(Number(row.monto).toFixed(2), ingXMonto, y + 3, { width: ingColMontoW, align: 'right' });
          y += 14;
        }
        const ti = Number(totales?.total_ingreso) || 0;
        doc.rect(margin, y, contentW, 16).fillAndStroke('#fef3c7', '#fbbf24');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#78350f')
          .text('Total ingresos', margin + ingPad, y + 4, { width: ingColMotivoW })
          .text(ti.toFixed(2), ingXMonto, y + 4, { width: ingColMontoW, align: 'right' });
        y += 26;

        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0d9488').text('Egresos (reintegros aprobados)', margin, y);
        y += 14;
        doc.rect(margin, y, contentW, 15).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569');
        const c0 = margin + 4;
        const c1 = margin + 52;
        const c2 = margin + 118;
        const c3 = margin + 248;
        const c4 = margin + 418;
        doc.text('Fecha', c0, y + 4, { width: 44 });
        doc.text('RUC / tipo', c1, y + 4, { width: 58 });
        doc.text('Nº doc.', c2, y + 4, { width: 120 });
        doc.text('Descripción', c3, y + 4, { width: 158 });
        doc.text('Monto', c4, y + 4, { width: 70, align: 'right' });
        y += 16;
        doc.font('Helvetica');
        for (const e of egresos || []) {
          if (y > 720) {
            doc.addPage();
            y = margin;
          }
          const desc = String(e.descripcion || '').substring(0, 48);
          doc.rect(margin, y, contentW, 20).stroke('#e2e8f0');
          doc.fontSize(7).fillColor('#0f172a')
            .text(String(e.fecha_documento || ''), c0, y + 5, { width: 44 })
            .text(String(e.ruc_proveedor || '').substring(0, 14), c1, y + 5, { width: 58 })
            .text(String(e.numero_documento || '').substring(0, 18), c2, y + 5, { width: 120 })
            .text(desc, c3, y + 5, { width: 158 })
            .text(Number(e.monto).toFixed(2), c4, y + 5, { width: 70, align: 'right' });
          y += 20;
        }
        const te = Number(totales?.total_egreso) || 0;
        const sal = Number(totales?.saldo) || 0;
        if (y > 700) {
          doc.addPage();
          y = margin;
        }
        doc.rect(margin, y, contentW, 17).fillAndStroke('#7f1d1d', '#7f1d1d');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
          .text('Total egresos', margin + 6, y + 5, { width: 380 })
          .text(`S/ ${te.toFixed(2)}`, c4, y + 5, { width: 70, align: 'right' });
        y += 21;
        doc.rect(margin, y, contentW, 17).fillAndStroke('#14532d', '#14532d');
        doc.text('Saldo del período (ingresos − egresos)', margin + 6, y + 5, { width: 380 })
          .text(`S/ ${sal.toFixed(2)}`, c4, y + 5, { width: 70, align: 'right' });
        y += 28;
        doc.fontSize(8).font('Helvetica').fillColor('#64748b')
          .text(
            'A continuación en el mismo documento PDF se incluyen los comprobantes y recibos Prayaga (orden por fecha de documento).',
            margin,
            y,
            { width: contentW, align: 'center' }
          );

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Añade al PDF las páginas de cada comprobante o recibo Prayaga (orden de reembolsosRows).
   * @returns {boolean} true si se añadió al menos una página de archivo
   */
  static async _appendComprobantesReintegrosAlPdf(merged, reembolsosRows) {
    const { PDFDocument, StandardFonts } = require('pdf-lib');
    const Reembolso = require('../models/Reembolso');
    let any = false;

    const drawImageFit = (page, img) => {
      const pw = 495;
      const ph = 700;
      const { width, height } = img.scale(1);
      const scale = Math.min(pw / width, ph / height, 1);
      const w = width * scale;
      const h = height * scale;
      const pageH = page.getHeight();
      page.drawImage(img, { x: 50, y: pageH - 50 - h, width: w, height: h });
    };

    for (const r of reembolsosRows || []) {
      const codigo = Reembolso.codigoTicket(r);
      const filePath = r.tiene_comprobante ? r.archivo_comprobante_path : r.archivo_recibo_generado_path;
      if (!filePath || !fs.existsSync(filePath)) {
        continue;
      }
      const ext = path.extname(filePath).toLowerCase();
      const bytes = fs.readFileSync(filePath);
      try {
        if (ext === '.pdf') {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach((p) => merged.addPage(p));
          any = true;
        } else if (ext === '.png') {
          const page = merged.addPage([595.28, 841.89]);
          const img = await merged.embedPng(bytes);
          drawImageFit(page, img);
          any = true;
        } else if (ext === '.jpg' || ext === '.jpeg') {
          const page = merged.addPage([595.28, 841.89]);
          const img = await merged.embedJpg(bytes);
          drawImageFit(page, img);
          any = true;
        } else {
          const page = merged.addPage([595.28, 841.89]);
          const font = await merged.embedFont(StandardFonts.Helvetica);
          const orig = path.basename(filePath);
          page.drawText(`No fusionado (formato ${ext}): ${orig} — ${codigo}`, {
            x: 50,
            y: 780,
            size: 10,
            font
          });
          any = true;
        }
      } catch (err) {
        console.warn('_appendComprobantesReintegrosAlPdf:', codigo, err.message);
        const page = merged.addPage([595.28, 841.89]);
        const font = await merged.embedFont(StandardFonts.Helvetica);
        page.drawText(`Error al incluir ${codigo}: ${err.message}`, { x: 50, y: 780, size: 9, font });
        any = true;
      }
    }

    return any;
  }

  /**
   * Solo comprobantes/recibos (sin resumen). Útil para pruebas.
   */
  static async fusionarComprobantesReintegros(reembolsosRows) {
    const { PDFDocument, StandardFonts } = require('pdf-lib');
    const merged = await PDFDocument.create();
    const any = await PDFService._appendComprobantesReintegrosAlPdf(merged, reembolsosRows);
    if (!any) {
      const page = merged.addPage([595.28, 841.89]);
      const font = await merged.embedFont(StandardFonts.Helvetica);
      page.drawText('No hay archivos PDF o imagen disponibles para fusionar en este período.', {
        x: 50,
        y: 780,
        size: 11,
        font
      });
    }
    return Buffer.from(await merged.save());
  }

  /**
   * Un solo PDF para Rocío: resumen formal (pdfkit) + fusión de comprobantes y recibos Prayaga.
   */
  static async generarPdfCajaChicaCompletoUnArchivo(bufResumenPdf, reembolsosRows) {
    const { PDFDocument, StandardFonts } = require('pdf-lib');
    const resumenBuf = Buffer.isBuffer(bufResumenPdf) ? bufResumenPdf : Buffer.from(bufResumenPdf);
    const merged = await PDFDocument.create();

    const summary = await PDFDocument.load(resumenBuf, { ignoreEncryption: true });
    const summaryPages = await merged.copyPages(summary, summary.getPageIndices());
    summaryPages.forEach((p) => merged.addPage(p));

    const anyComp = await PDFService._appendComprobantesReintegrosAlPdf(merged, reembolsosRows);
    if (!anyComp) {
      const page = merged.addPage([595.28, 841.89]);
      const font = await merged.embedFont(StandardFonts.Helvetica);
      page.drawText(
        'No se adjuntaron comprobantes ni recibos Prayaga: no hay archivos en el servidor o las rutas no coinciden con este entorno.',
        { x: 50, y: 780, size: 11, font, maxWidth: 495 }
      );
    }

    const out = await merged.save();
    return Buffer.from(out);
  }
}

module.exports = PDFService;
