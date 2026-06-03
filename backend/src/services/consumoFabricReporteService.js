const ExcelJS = require('exceljs');
const { MESES_NOMBRE } = require('./consumoFabricPaygParser');

function agruparSum(filas, keyFn) {
  const map = new Map();
  for (const f of filas) {
    const key = keyFn(f);
    const prev = map.get(key) || { key, quantity: 0, unit: f.unit, items: 0 };
    prev.quantity += f.quantity;
    prev.items += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function fmtNum(n, dec = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

function fmtMonto(n, moneda = 'US$') {
  return `${moneda} ${fmtNum(n, 2)}`;
}

function generarInsights(meta, porComponente, porDia, montoMensual) {
  const tips = [];
  if (porComponente.length) {
    const top = porComponente[0];
    tips.push(
      `${top.key} es el componente con mayor consumo (${fmtNum(top.quantity)} ${top.unit}, ${pct(top.quantity, porComponente.reduce((s, x) => s + x.quantity, 0))}% del total en su unidad).`
    );
  }
  if (porDia.length >= 3) {
    const topDia = porDia[0];
    tips.push(`El día con más actividad registrada fue ${topDia.key} (${fmtNum(topDia.quantity)} ${topDia.unit}).`);
  }
  const fabric = porComponente.filter((c) =>
    String(c.key).toLowerCase().includes('compute') || String(c.key).toLowerCase().includes('data')
  );
  if (fabric.length >= 2) {
    tips.push(
      'Revise pipelines de Data Movement y Compute Pool si busca optimizar tiempos de proceso.'
    );
  }
  if (montoMensual) {
    tips.push(
      `Monto de referencia del periodo (${MESES_NOMBRE[montoMensual.mes]} ${montoMensual.anio}): ${fmtMonto(montoMensual.monto, montoMensual.moneda)}. El detalle de esta página describe solo consumo técnico (CU, GB, etc.).`
    );
  } else {
    tips.push(
      'No hay monto mensual registrado para este cliente y periodo. Puede cargarlo en Montos mensuales para incluirlo en el reporte.'
    );
  }
  return tips;
}

/**
 * Construye el JSON del reporte (uso + monto manual embebido).
 */
function construirReporte(meta, filas, montoMensual) {
  const porUnidad = agruparSum(filas, (f) => f.unit);
  const totalCu = filas
    .filter((f) => /hour|hora|cu/i.test(f.unit))
    .reduce((s, f) => s + f.quantity, 0);

  const porProducto = agruparSum(filas, (f) => f.productName).map((x) => ({
    ...x,
    pct: pct(x.quantity, filas.reduce((s, f) => s + f.quantity, 0))
  }));

  const porComponente = agruparSum(filas, (f) => f.skuName).map((x) => ({
    ...x,
    pct: pct(
      x.quantity,
      agruparSum(filas, (f) => f.skuName).reduce((s, a) => s + a.quantity, 0)
    )
  }));

  const porResourceGroup = agruparSum(filas, (f) => f.resourceGroup);
  const porDia = agruparSum(
    filas.filter((f) => f.usageDate),
    (f) => f.usageDate
  ).slice(0, 31);

  const topMeters = agruparSum(filas, (f) => `${f.skuName} · ${f.meterName}`).slice(0, 15);

  const mes = meta.month || montoMensual?.mes;
  const anio = meta.year || montoMensual?.anio;

  const reporte = {
    meta: {
      ...meta,
      mes,
      anio,
      mesLabel: mes ? MESES_NOMBRE[mes] : null,
      totalFilas: filas.length,
      generadoEn: new Date().toISOString()
    },
    montoMensual: montoMensual
      ? {
          monto: Number(montoMensual.monto),
          moneda: montoMensual.moneda || 'US$',
          mes: montoMensual.mes,
          anio: montoMensual.anio,
          mesLabel: MESES_NOMBRE[montoMensual.mes]
        }
      : null,
    resumen: {
      totalRegistros: filas.length,
      totalCuHoras: Math.round(totalCu * 100) / 100,
      porUnidad
    },
    porProducto,
    porComponente,
    porResourceGroup,
    porDia,
    topMeters,
    insights: []
  };

  reporte.insights = generarInsights(meta, porComponente, porDia, reporte.montoMensual);
  return reporte;
}

async function exportarReporteExcel(reporte) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Portal Prayaga - Consumo Fabric';

  const resumen = wb.addWorksheet('Resumen');
  resumen.columns = [
    { header: 'Campo', key: 'campo', width: 28 },
    { header: 'Valor', key: 'valor', width: 50 }
  ];
  const m = reporte.meta;
  const rows = [
    ['Cliente', m.customerName],
    ['Dominio', m.customerDomain || '—'],
    ['País', m.customerCountry || '—'],
    ['Reseller', m.reseller || '—'],
    ['Código Ingram', m.codigoIngram || '—'],
    ['Periodo', `${m.periodoInicio || '—'} a ${m.periodoFin || '—'}`],
    ['Mes consumo', m.mesLabel || '—'],
    ['Año', m.anio || '—'],
    ['Filas PAYG analizadas', m.totalFilas],
    ['Total CU (horas aprox.)', reporte.resumen.totalCuHoras]
  ];
  if (reporte.montoMensual) {
    rows.push([
      'Monto mensual (referencia)',
      fmtMonto(reporte.montoMensual.monto, reporte.montoMensual.moneda)
    ]);
  }
  rows.forEach(([campo, valor]) => resumen.addRow({ campo, valor }));

  if (reporte.insights?.length) {
    resumen.addRow({});
    resumen.addRow({ campo: 'Observaciones', valor: '' });
    reporte.insights.forEach((t, i) => resumen.addRow({ campo: `${i + 1}`, valor: t }));
  }

  const addTabla = (name, items, tituloCantidad = 'Cantidad') => {
    const sh = wb.addWorksheet(name.slice(0, 31));
    sh.columns = [
      { header: 'Concepto', key: 'key', width: 42 },
      { header: tituloCantidad, key: 'quantity', width: 16 },
      { header: 'Unidad', key: 'unit', width: 14 },
      { header: '% aprox.', key: 'pct', width: 12 }
    ];
    for (const it of items) {
      sh.addRow({
        key: it.key,
        quantity: Math.round(it.quantity * 100) / 100,
        unit: it.unit,
        pct: it.pct != null ? it.pct : ''
      });
    }
  };

  addTabla('Por producto', reporte.porProducto);
  addTabla('Por componente', reporte.porComponente);
  addTabla('Por recurso', reporte.porResourceGroup);
  addTabla('Por día', reporte.porDia);
  addTabla('Top medidores', reporte.topMeters);

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  construirReporte,
  exportarReporteExcel,
  fmtNum,
  fmtMonto
};
