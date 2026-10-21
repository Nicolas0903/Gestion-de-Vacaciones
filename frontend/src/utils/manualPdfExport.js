import { jsPDF } from 'jspdf';

function stripMarkdown(line) {
  return String(line)
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/^\|\s*/, '')
    .replace(/\s*\|$/, '')
    .replace(/\|/g, ' | ')
    .trim();
}

/**
 * @param {{ titulo: string, markdown: string, fileSlug: string }} opts
 */
export function descargarManualPdf({ titulo, markdown, fileSlug }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 18;

  const newPageIfNeeded = (extra = 8) => {
    if (y + extra > pageH - 15) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo || 'Manual de usuario', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Portal Prayaga Interno — Manual de usuario', margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  const lines = (markdown || '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 3;
      continue;
    }
    if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;

    const isH1 = line.startsWith('# ');
    const isH2 = line.startsWith('## ');
    const isH3 = line.startsWith('### ');
    const text = stripMarkdown(line);

    if (isH1) {
      newPageIfNeeded(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
    } else if (isH2) {
      newPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      y += 2;
    } else if (isH3) {
      newPageIfNeeded(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    const wrapped = doc.splitTextToSize(text, maxW);
    for (const w of wrapped) {
      newPageIfNeeded(6);
      doc.text(w, margin, y);
      y += isH1 ? 7 : isH2 ? 6 : 5;
    }
    if (isH1 || isH2) y += 2;
  }

  const name = `Manual-${fileSlug || 'modulo'}.pdf`;
  doc.save(name);
}
