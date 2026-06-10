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
  emerald: '#059669',
  grid: '#e2e8f0'
};

const PALETTE = [
  '#4f46e5',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777'
];

const PAGE_W = 515;
const MARGIN = 40;

function necesitaPagina(doc, y, altura = 80) {
  if (y + altura > 760) {
    doc.addPage();
    return 50;
  }
  return y;
}

function pieSlice(doc, cx, cy, radius, startDeg, endDeg, color) {
  if (endDeg - startDeg < 0.2) return;
  doc.save();
  doc.fillColor(color);
  doc.moveTo(cx, cy);
  doc.arc(cx, cy, radius, startDeg, endDeg);
  doc.lineTo(cx, cy);
  doc.fill();
  doc.restore();
}

function dibujarBarrasHorizontales(doc, titulo, items, x, y, width, maxBars = 8) {
  const list = items.slice(0, maxBars);
  if (!list.length) return y;

  y = necesitaPagina(doc, y, 20 + list.length * 16);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate).text(titulo, x, y);
  let cy = y + 14;

  const labelW = 105;
  const valueW = 72;
  const barMaxW = width - labelW - valueW - 16;
  const max = Math.max(...list.map((i) => i.quantity), 1);
  const barH = 12;

  list.forEach((it) => {
    cy = necesitaPagina(doc, cy, 18);
    const w = Math.max(3, (it.quantity / max) * barMaxW);
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(COLORS.slate)
      .text(String(it.key).slice(0, 30), x, cy + 1, { width: labelW, ellipsis: true });
    doc.rect(x + labelW + 4, cy, w, barH).fill(COLORS.bar);
    doc
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(`${fmtNum(it.quantity)} (${it.pct || 0}%)`, x + labelW + barMaxW + 10, cy + 1, {
        width: valueW
      });
    cy += barH + 5;
  });
  return cy + 6;
}

function dibujarHistorico(doc, historico, x, y, width) {
  const withData = (historico || []).filter((h) => h.monto != null || h.cuHoras > 0);
  if (!withData.length) return y;

  y = necesitaPagina(doc, y, 100);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(COLORS.slate)
    .text('Evolución: monto mensual vs consumo (CU horas)', x, y);
  let cy = y + 14;
  const chartH = 56;
  const maxMonto = Math.max(...withData.map((h) => h.monto || 0), 1);
  const maxCu = Math.max(...withData.map((h) => h.cuHoras || 0), 1);
  const chartW = width - 30;
  const slot = Math.max(28, chartW / withData.length);

  doc.strokeColor(COLORS.grid).lineWidth(0.5);
  doc.moveTo(x + 10, cy + chartH).lineTo(x + 10 + chartW, cy + chartH).stroke();

  withData.forEach((h, i) => {
    const bx = x + 18 + i * slot;
    const hCu = Math.max(3, ((h.cuHoras || 0) / maxCu) * chartH);
    const hMo = h.monto != null ? Math.max(3, (h.monto / maxMonto) * chartH) : 0;
    doc.rect(bx, cy + chartH - hCu, 10, hCu).fill(COLORS.bar);
    if (hMo) doc.rect(bx + 12, cy + chartH - hMo, 10, hMo).fill(COLORS.emerald);
    doc
      .fontSize(6)
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text(`${String(h.mesLabel || h.mes).slice(0, 3)} ${h.anio}`, bx - 4, cy + chartH + 4, {
        width: slot + 8,
        align: 'center'
      });
  });

  doc.fontSize(6).fillColor(COLORS.bar).text('■ CU horas', x, cy + chartH + 18);
  doc.fillColor(COLORS.emerald).text('■ Monto', x + 58, cy + chartH + 18);
  return cy + chartH + 32;
}

function dibujarDonaComponentes(doc, items, x, y) {
  const list = items.slice(0, 8);
  if (!list.length) return y;

  y = necesitaPagina(doc, y, 130);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(COLORS.slate)
    .text('Distribución por componente (CU)', x, y);

  const cx = x + 58;
  const cy = y + 68;
  const R = 46;
  const rInner = 26;
  const total = list.reduce((s, i) => s + i.quantity, 0) || 1;
  let angle = -90;

  list.forEach((it, idx) => {
    const sweep = (it.quantity / total) * 360;
    pieSlice(doc, cx, cy, R, angle, angle + sweep, PALETTE[idx % PALETTE.length]);
    angle += sweep;
  });
  doc.circle(cx, cy, rInner).fill('#ffffff');

  let ly = y + 14;
  list.forEach((it, idx) => {
    doc.rect(x + 130, ly, 7, 7).fill(PALETTE[idx % PALETTE.length]);
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor(COLORS.slate)
      .text(String(it.key).slice(0, 32), x + 142, ly, { width: 220, ellipsis: true });
    doc.fillColor(COLORS.muted).text(`${it.pct || 0}%`, x + 370, ly, { width: 40, align: 'right' });
    ly += 11;
  });

  return y + 128;
}

function dibujarUsoDiario(doc, porDia, x, y, width) {
  const data = (porDia || []).slice(0, 24);
  if (!data.length) return y;

  y = necesitaPagina(doc, y, 100);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate).text('Uso diario (CU horas)', x, y);
  const chartY = y + 14;
  const chartH = 62;
  const max = Math.max(...data.map((d) => d.quantity), 1);
  const gap = 2;
  const barW = Math.min(12, (width - 24) / data.length - gap);

  doc.strokeColor(COLORS.grid).lineWidth(0.5);
  doc.moveTo(x + 8, chartY + chartH).lineTo(x + 8 + width - 16, chartY + chartH).stroke();

  data.forEach((d, i) => {
    const h = Math.max(2, (d.quantity / max) * chartH);
    const bx = x + 12 + i * (barW + gap);
    doc.rect(bx, chartY + chartH - h, barW, h).fill(COLORS.bar2);
    if (data.length <= 12 || i % 2 === 0) {
      const lbl = String(d.key).slice(8) || String(d.key);
      doc
        .fontSize(5)
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(lbl, bx - 1, chartY + chartH + 3, { width: barW + 4, align: 'center' });
    }
  });

  return chartY + chartH + 16;
}

function dibujarTablaMedidores(doc, rows, x, y) {
  const table = (rows || []).slice(0, 15);
  if (!table.length) return y;

  y = necesitaPagina(doc, y, 40);
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(COLORS.slate)
    .text('Detalle de medidores (top 15)', x, y);
  y += 14;

  const colMed = 300;
  const colQty = 90;
  doc.rect(x, y, PAGE_W, 16).fill('#f1f5f9');
  doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.muted);
  doc.text('Medidor', x + 6, y + 4);
  doc.text('Cantidad', x + colMed, y + 4, { width: colQty, align: 'right' });
  doc.text('Unidad', x + colMed + colQty + 8, y + 4);
  y += 16;

  table.forEach((row, i) => {
    y = necesitaPagina(doc, y, 14);
    if (i % 2 === 0) doc.rect(x, y, PAGE_W, 13).fill('#fafafa');
    doc.fontSize(7).font('Helvetica').fillColor(COLORS.slate);
    doc.text(String(row.key).slice(0, 55), x + 6, y + 3, { width: colMed - 10, ellipsis: true });
    doc.text(fmtNum(row.quantity), x + colMed, y + 3, { width: colQty, align: 'right' });
    doc.fillColor(COLORS.muted).text(String(row.unit || '—'), x + colMed + colQty + 8, y + 3);
    y += 13;
  });
  return y + 8;
}

function generarReportePdf(reporte) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const m = reporte.meta || {};
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, 35, { width: 90 });
        doc.y = 100;
      } else {
        doc.y = 50;
      }

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(COLORS.indigo)
        .text('Reporte Consumo Microsoft Fabric', MARGIN, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica').fillColor(COLORS.slate).text(m.customerName || '—');
      doc
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text(
          `${m.mesLabel || ''} ${m.anio || ''} · ${m.periodoInicio || '—'} — ${m.periodoFin || ''}`,
          { continued: false }
        );

      doc.moveDown(0.6);
      doc.rect(MARGIN, doc.y, PAGE_W, 2).fill(COLORS.indigo);
      doc.moveDown(0.5);

      const kpiY = doc.y;
      const boxW = 122;
      const kpis = [
        ['CU horas', fmtNum(reporte.resumen?.totalCuHoras)],
        [
          'Monto mensual',
          reporte.montoMensual
            ? fmtMonto(reporte.montoMensual.monto, reporte.montoMensual.moneda)
            : '—'
        ],
        ['Componentes', String((reporte.porComponenteCu || []).length)],
        ['Registros', String(m.totalFilas || '—')]
      ];
      kpis.forEach(([label, val], i) => {
        const bx = MARGIN + i * (boxW + 8);
        doc.roundedRect(bx, kpiY, boxW, 48, 6).fillAndStroke('#eef2ff', '#c7d2fe');
        doc.fontSize(7).font('Helvetica').fillColor(COLORS.muted).text(label, bx + 8, kpiY + 8);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.slate)
          .text(String(val), bx + 8, kpiY + 22, { width: boxW - 14, ellipsis: true });
      });
      let cy = kpiY + 58;

      cy = dibujarHistorico(doc, reporte.historicoCombinado, MARGIN, cy, PAGE_W);

      if (reporte.insights?.length) {
        cy = necesitaPagina(doc, cy, 40);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.slate).text('Hallazgos clave', MARGIN, cy);
        cy += 14;
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
        reporte.insights.forEach((t) => {
          cy = necesitaPagina(doc, cy, 20);
          doc.text(`• ${t}`, MARGIN + 4, cy, { width: PAGE_W - 8 });
          cy += doc.heightOfString(`• ${t}`, { width: PAGE_W - 8 }) + 4;
        });
        cy += 6;
      }

      cy = necesitaPagina(doc, cy, 140);
      const mitad = MARGIN + PAGE_W / 2 + 6;
      const yDona = dibujarDonaComponentes(doc, reporte.porComponenteCu || [], MARGIN, cy);
      const yDia = dibujarUsoDiario(doc, reporte.porDia || [], mitad - 6, cy, PAGE_W / 2 - 12);
      cy = Math.max(yDona, yDia) + 8;

      if ((reporte.porProducto || []).length) {
        cy = dibujarBarrasHorizontales(
          doc,
          'Por producto / servicio',
          reporte.porProducto,
          MARGIN,
          cy,
          PAGE_W,
          6
        );
      }

      dibujarTablaMedidores(doc, reporte.topMeters, MARGIN, cy);

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generarReportePdf };
