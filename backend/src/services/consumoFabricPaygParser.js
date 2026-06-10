const ExcelJS = require('exceljs');

const MESES_NOMBRE = [
  '',
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE'
];

function normKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normCliente(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function claveCliente(name) {
  return String(name || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(S\s*A\s*C|S\s*A|SAC)\s*$/i, '')
    .trim();
}

function parseMesInput(val) {
  if (val == null || val === '') return null;
  const n = parseInt(val, 10);
  if (n >= 1 && n <= 12) return n;
  const t = String(val).trim().toUpperCase();
  const idx = MESES_NOMBRE.indexOf(t);
  if (idx > 0) return idx;
  const map = {
    ENERO: 1,
    FEBRERO: 2,
    MARZO: 3,
    ABRIL: 4,
    MAYO: 5,
    JUNIO: 6,
    JULIO: 7,
    AGOSTO: 8,
    SEPTIEMBRE: 9,
    SETIEMBRE: 9,
    OCTUBRE: 10,
    NOVIEMBRE: 11,
    DICIEMBRE: 12
  };
  return map[t] || null;
}

function cellValue(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v.text != null) return String(v.text).trim();
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function parseFecha(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function buildHeaderMap(row) {
  const map = {};
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    const k = normKey(cell.value);
    if (k) map[k] = col;
  });
  return map;
}

function getCol(map, ...aliases) {
  for (const a of aliases) {
    const c = map[normKey(a)];
    if (c) return c;
  }
  return null;
}

function readRow(row, col) {
  if (!col) return '';
  return cellValue(row.getCell(col).value);
}

function readNum(row, col) {
  const v = row.getCell(col)?.value;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lee hoja PAYG y devuelve filas normalizadas + metadatos del cliente/periodo.
 */
async function parsePaygWorkbook(inputPathOrBuffer, isBuffer = false) {
  const wb = new ExcelJS.Workbook();
  if (isBuffer) {
    await wb.xlsx.load(inputPathOrBuffer);
  } else {
    await wb.xlsx.readFile(inputPathOrBuffer);
  }

  let ws = wb.getWorksheet('PAYG');
  if (!ws) {
    ws = wb.worksheets.find((s) => normKey(s.name) === 'payg') || wb.worksheets[0];
  }
  if (!ws || ws.rowCount < 2) {
    throw new Error('No se encontró la hoja PAYG con datos.');
  }

  const headerRow = ws.getRow(1);
  const h = buildHeaderMap(headerRow);

  const colQty = getCol(h, 'quantity', 'cantidad');
  const colSku = getCol(h, 'skuname', 'sku_name');
  const colProduct = getCol(h, 'productname', 'product_name');
  const colMeter = getCol(h, 'metername', 'meter_name');
  const colSub = getCol(h, 'metersubcategory', 'meter_subcategory');
  const colUnit = getCol(h, 'unit', 'unittype', 'unit_type');
  const colRg = getCol(h, 'resourcegroup', 'resource_group');
  const colUsage = getCol(h, 'usagedate', 'usage_date');
  const colStart = getCol(h, 'chargestartdate', 'charge_start_date');
  const colEnd = getCol(h, 'chargeenddate', 'charge_end_date');
  const colCustomer = getCol(h, 'customername', 'customer_name');
  const colDomain = getCol(h, 'customerdomainname', 'customer_domain_name');
  const colCountry = getCol(h, 'customercountry', 'customer_country');
  const colIngram = getCol(h, 'codigo_ingram', 'codigoingram');
  const colReseller = getCol(h, 'reseller');
  const colYear = getCol(h, 'year', 'ao', 'anio');
  const colMonth = getCol(h, 'month', 'mes');

  if (!colQty || !colCustomer) {
    throw new Error('Encabezados PAYG inválidos: se requiere al menos CustomerName y Quantity.');
  }

  const filas = [];
  let meta = null;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const customerName = readRow(row, colCustomer);
    if (!customerName) continue;

    const qty = readNum(row, colQty);
    if (qty === 0) continue;

    const unit = readRow(row, colUnit) || '—';
    const usageDate = parseFecha(row.getCell(colUsage)?.value);
    const year = parseInt(readRow(row, colYear), 10) || null;
    const month = parseInt(readRow(row, colMonth), 10) || null;

    if (!meta) {
      meta = {
        customerName: normCliente(customerName),
        customerDomain: readRow(row, colDomain),
        customerCountry: readRow(row, colCountry),
        codigoIngram: readRow(row, colIngram),
        reseller: readRow(row, colReseller),
        periodoInicio: parseFecha(row.getCell(colStart)?.value),
        periodoFin: parseFecha(row.getCell(colEnd)?.value),
        year,
        month
      };
    }

    filas.push({
      skuName: readRow(row, colSku) || '—',
      productName: readRow(row, colProduct) || '—',
      meterName: readRow(row, colMeter) || '—',
      meterSubCategory: readRow(row, colSub) || '—',
      resourceGroup: readRow(row, colRg) || '—',
      unit,
      quantity: qty,
      usageDate
    });
  }

  if (!filas.length) {
    throw new Error('La hoja PAYG no contiene filas de consumo con cantidad > 0.');
  }

  const names = new Set();
  for (let r = 2; r <= ws.rowCount; r++) {
    const cn = readRow(ws.getRow(r), colCustomer);
    if (cn) names.add(normCliente(cn));
  }
  if (names.size > 1) {
    throw new Error(
      `El archivo contiene más de un cliente (${[...names].join(', ')}). Suba un Excel por cliente.`
    );
  }

  return { meta, filas };
}

/**
 * Importa montos desde Excel (CustomerName, Mes, Año, Monto, Moneda).
 */
async function parseMontosWorkbook(inputPathOrBuffer, isBuffer = false) {
  const wb = new ExcelJS.Workbook();
  if (isBuffer) {
    await wb.xlsx.load(inputPathOrBuffer);
  } else {
    await wb.xlsx.readFile(inputPathOrBuffer);
  }
  const ws = wb.worksheets[0];
  if (!ws || ws.rowCount < 2) {
    throw new Error('El archivo de montos está vacío.');
  }
  const h = buildHeaderMap(ws.getRow(1));
  const colCustomer = getCol(h, 'customername', 'customer_name', 'cliente');
  const colMes = getCol(h, 'mes', 'month');
  const colAnio = getCol(h, 'ao', 'anio', 'year');
  const colMonto = getCol(h, 'monto', 'amount');
  const colMoneda = getCol(h, 'moneda', 'currency');

  if (!colCustomer || !colMes || !colAnio || !colMonto) {
    throw new Error('Columnas requeridas: CustomerName, Mes, Año, Monto.');
  }

  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const customerName = normCliente(readRow(row, colCustomer));
    if (!customerName) continue;
    const mes = parseMesInput(row.getCell(colMes)?.value);
    const anio = parseInt(readRow(row, colAnio), 10);
    const monto = readNum(row, colMonto);
    if (!mes || !anio) continue;
    rows.push({
      customer_name: customerName,
      mes,
      anio,
      monto,
      moneda: readRow(row, colMoneda) || 'US$'
    });
  }
  if (!rows.length) throw new Error('No se encontraron filas válidas de montos.');
  return rows;
}

module.exports = {
  MESES_NOMBRE,
  normCliente,
  claveCliente,
  parseMesInput,
  parsePaygWorkbook,
  parseMontosWorkbook
};
