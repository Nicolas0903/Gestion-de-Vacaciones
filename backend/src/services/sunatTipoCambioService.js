const https = require('https');

const SUNAT_TXT_URL = 'https://www.sunat.gob.pe/a/txt/tipoCambio.txt';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'PrayagaPortal/1.0' } }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`SUNAT respondió HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data.trim()));
      })
      .on('error', reject);
  });
}

/** Parsea línea SUNAT: DD/MM/YYYY|compra|venta| o YYYYMMDD|compra|venta */
function parseLinea(line) {
  const parts = String(line || '')
    .trim()
    .split('|')
    .map((x) => x.trim());
  if (parts.length < 3) return null;
  const fechaRaw = parts[0];
  const compra = Number(parts[1]);
  const venta = Number(parts[2]);
  if (!Number.isFinite(compra) || !Number.isFinite(venta)) return null;

  let fecha = null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaRaw)) {
    const [d, m, y] = fechaRaw.split('/');
    fecha = `${y}-${m}-${d}`;
  } else if (/^\d{8}$/.test(fechaRaw)) {
    fecha = `${fechaRaw.slice(0, 4)}-${fechaRaw.slice(4, 6)}-${fechaRaw.slice(6, 8)}`;
  }
  if (!fecha) return null;

  return {
    fecha,
    compra: Math.round(compra * 1000) / 1000,
    venta: Math.round(venta * 1000) / 1000
  };
}

async function obtenerTipoCambioSunat() {
  const text = await fetchText(SUNAT_TXT_URL);
  const line = text.split(/\r?\n/).find((l) => l.trim()) || text;
  const parsed = parseLinea(line);
  if (!parsed) {
    throw new Error('No se pudo interpretar el tipo de cambio SUNAT');
  }
  return {
    fuente: 'SUNAT',
    url: SUNAT_TXT_URL,
    ...parsed
  };
}

module.exports = { obtenerTipoCambioSunat };
