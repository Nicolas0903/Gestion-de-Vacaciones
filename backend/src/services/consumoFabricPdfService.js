const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { fmtNum, fmtMonto } = require('./consumoFabricReporteService');

const COLORS = {
  indigo: '#4f46e5',
  slate: '#1e293b',
  muted: '#64748b',
  bar: '#6366f1',
  bar2: '#8b5cf6',
  emerald: '#059669'
};

function dibujarBarras(doc, items, x, y, width, maxBars = 8) {
  const list = items.slice(0, maxBars);
  const max = Math.max(...list.map((i) => i.quantity), 1);
  const barH = 14;
  const gap = 4;
  let cy = y;

  doc.fontSize(8).fillColor(COLORS.muted).text('Consumo por componente (CU)', x, cy);
  cy += 14;

  for (const it of list) {
    const w = Math.max(4, (it.quantity / max) * (width - 120));
    doc.fontSize(7).fillColor(COLORS.slate).text(String(it.key).slice(0, 32), x, cy + 2, {
      width: 110,
      ellipsis: true
    });
    doc.rect(x + 115, cy, w, barH - 2).fill(COLORS.bar);
    doc
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(`${fmtNum(it.quantity)} (${it.pct || 0}%)`, x + 115 + w + 4, cy + 2);
    cy += barH + gap;
  }
  return cy;
}

function dibujarHistorico(doc, historico, x, y, width) {
  if (!historico?.length) return y;
  const withData = historico.filter((h) => h.monto != null || h.cuHoras > 0);
  if (!withData.length) return y;

  doc.fontSize(9).fillColor(COLORS.slate).text('Evolución mensual (monto vs CU horas)', x, y);
  let cy = y + 14;
  const maxMonto = Math.max(...withData.map((h) => h.monto || 0), 1);
  const maxCu = Math.max(...withData.map((h) => h.cuHoras || 0), 1);
  const chartW = width - 40;
  const slot = chartW / withData.length;

  withData.forEach((h, i) => {
    const bx = x + 20 + i * slot + 4;
    const hCu = Math.max(4, ((h.cuHoras || 0) / maxCu) * 50);
    const hMo = h.monto != null ? Math.max(4, (h.monto / maxMonto) * 50) : 0;
    doc.rect(bx, cy + (50 - hCu), 8, hCu).fill(COLORS.bar);
    if (hMo) doc.rect(bx + 10, cy + (50 - hMo), 8, hMo).fill(COLORS.emerald);
    doc
      .fontSize(6)
      .fillColor(COLORS.muted)
      .text(String(h.mesLabel || h.mes).slice(0, 3), bx - 2, cy + 54, { width: slot });
  });

  doc.fontSize(6).fillColor(COLORS.bar).text('■ CU', x, cy + 62);
  doc.fillColor(COLORS.emerald).text('■ Monto', x + 40, cy + 62);
  return cy + 78;
}

function generarReportePdf(reporte) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const m = reporte.meta || {};
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 35, { width: 90 });
        doc.y = 100;
      } else {
        doc.y = 50;
      }

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(COLORS.indigo)
        .text('Reporte Consumo Microsoft Fabric', 40, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica').fillColor(COLORS.slate).text(m.customerName || '—');
      doc
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(
          `${m.mesLabel || ''} ${m.anio || ''} · ${m.periodoInicio || '—'} — ${m.periodoFin || ''}`,
          { continued: false }
        );

      doc.moveDown(0.8);
      doc.rect(40, doc.y, 515, 2).fill(COLORS.indigo);
      doc.moveDown(0.6);

      const kpiY = doc.y;
      const boxW = 160;
      const kpis = [
        ['CU horas (periodo)', fmtNum(reporte.resumen?.totalCuHoras)],
        [
          'Monto mensual',
          reporte.montoMensual
            ? fmtMonto(reporte.montoMensual.monto, reporte.montoMensual.moneda)
            : '—'
        ],
        ['Registros de consumo', String(m.totalFilas || '—')]
      ];
      kpis.forEach(([label, val], i) => {
        const bx = 40 + i * (boxW + 12);
        doc.roundedRect(bx, kpiY, boxW, 52, 6).fillAndStroke('#eef2ff', '#c7d2fe');
        doc.fontSize(8).fillColor(COLORS.muted).text(label, bx + 10, kpiY + 10);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.slate).text(val, bx + 10, kpiY + 26);
      });
      doc.font('Helvetica');
      doc.y = kpiY + 62;

      let cy = doc.y + 8;
      cy = dibujarHistorico(doc, reporte.historicoCombinado, 40, cy, 515);
      cy = dibujarBarras(doc, reporte.porComponenteCu || [], 40, cy + 8, 515);

      if (doc.y > 680) {
        doc.addPage();
        cy = 50;
      } else {
        cy += 12;
      }

      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.slate).text('Resumen para el cliente', 40, cy);
      cy += 16;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
      (reporte.insights || []).forEach((t) => {
        doc.text(`• ${t}`, 45, cy, { width: 500 });
        cy += doc.heightOfString(`• ${t}`, { width: 500 }) + 4;
      });

      cy += 10;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate).text('Top medidores', 40, cy);
      cy += 14;
      const table = (reporte.topMeters || []).slice(0, 10);
      table.forEach((row) => {
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor(COLORS.slate)
          .text(`${row.key}: ${fmtNum(row.quantity)} ${row.unit}`, 45, cy);
        cy += 12;
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generarReportePdf };
