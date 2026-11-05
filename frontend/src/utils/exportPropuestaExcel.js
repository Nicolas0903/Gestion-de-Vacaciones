import * as XLSX from 'xlsx';

/**
 * Exporta solo la propuesta económica (cuadros de la pestaña Propuesta) a .xlsx
 */
export function exportarPropuestaEconomicaExcel({
  codigo = '',
  cliente = '',
  proyecto = '',
  moneda = 'PEN',
  igvPct = 18,
  calc,
  limiteTotalFinal = 0
}) {
  if (!calc) return false;

  const rows = [];
  const line = (arr) => rows.push(arr);
  const blank = () => rows.push([]);

  line(['PROPUESTA ECONÓMICA']);
  line(['Código', codigo]);
  line(['Cliente', cliente]);
  line(['Proyecto', proyecto]);
  line(['Moneda', moneda === 'USD' ? 'USD ($)' : 'PEN (S/)']);
  line(['IGV (%)', Number(igvPct) || 0]);
  if (Number(limiteTotalFinal) > 0) {
    line(['Tope comercial (total final máx.)', Number(limiteTotalFinal)]);
  }
  blank();

  line(['Inversión por recursos / roles']);
  line(['Cantidad', 'Actividades', 'Inversión', 'IGV', 'Total final']);
  for (const r of calc.inversion_roles || []) {
    line([
      Number(r.cantidad) || 1,
      r.actividad || '',
      Number(r.inversion) || 0,
      Number(r.igv) || 0,
      Number(r.total) || 0
    ]);
  }
  line([
    '',
    'TOTAL',
    calc.totales?.inversion_total ?? 0,
    calc.totales?.igv_inversion ?? 0,
    calc.totales?.total_inversion ?? 0
  ]);
  blank();

  line(['Detalle de propuesta']);
  line(['Actividad', 'Horas', 'Precio total']);
  for (const d of calc.detalle || []) {
    line([d.actividad || '', Number(d.horas) || 0, Number(d.precio) || 0]);
  }
  const horasDet = (calc.detalle || []).reduce((s, d) => s + (Number(d.horas) || 0), 0);
  line(['TOTAL GENERAL', horasDet, calc.totales?.detalle_total ?? 0]);
  line([`IGV ${Number(igvPct)}%`, '', calc.totales?.detalle_igv ?? 0]);
  line(['TOTAL FINAL', '', calc.totales?.detalle_final ?? 0]);
  blank();

  line(['Forma de pago']);
  line(['Descripción', 'Porcentaje', 'Monto']);
  for (const p of calc.pagos_forma || []) {
    line([
      p.descripcion || '',
      Math.round((Number(p.porcentaje) || 0) * 10000) / 100,
      Number(p.monto) || 0
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 48 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Propuesta económica');

  const safe = String(codigo || 'cotizacion')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 60);
  XLSX.writeFile(wb, `${safe || 'cotizacion'}_propuesta-economica.xlsx`);
  return true;
}
