import html2canvas from 'html2canvas';
import { formatoMontoRendicion } from './monedaRendicion';

function filaTabla(cols) {
  return `<tr>${cols.map((c) => `<td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:12px;">${c}</td>`).join('')}</tr>`;
}

/** Genera PNG (data URL) del resumen de propuesta para el correo de aprobación. */
export async function capturarImagenResumenPropuesta({ codigo, cliente, propuesta, moneda = 'USD' }) {
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const roles = propuesta?.inversion_roles || [];
  const igv = Number(propuesta?.igv_pct ?? 18);
  let totalInv = 0;
  let totalIgv = 0;
  let totalFinal = 0;
  const filas = roles.map((r) => {
    const inv = Number(r.inversion) || 0;
    const igvM = Math.round(inv * (igv / 100) * 100) / 100;
    const tot = Math.round((inv + igvM) * 100) / 100;
    totalInv += inv;
    totalIgv += igvM;
    totalFinal += tot;
    const act = [r.actividad, r.consultor_nombre].filter(Boolean).join(' — ');
    return filaTabla([act || '—', fmt(inv), fmt(igvM), fmt(tot)]);
  });
  totalInv = Math.round(totalInv * 100) / 100;
  totalIgv = Math.round(totalIgv * 100) / 100;
  totalFinal = Math.round(totalFinal * 100) / 100;

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:720px;background:#fff;padding:16px;font-family:Segoe UI,sans-serif;color:#0f172a;';
  host.innerHTML = `
    <h2 style="margin:0 0 4px;font-size:16px;">Propuesta económica ${codigo || ''}</h2>
    <p style="margin:0 0 12px;font-size:12px;color:#64748b;">${cliente || ''}</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#065f46;color:#fff;">
        <th style="padding:8px;text-align:left;font-size:12px;">Actividades</th>
        <th style="padding:8px;text-align:right;font-size:12px;">Inversión</th>
        <th style="padding:8px;text-align:right;font-size:12px;">IGV</th>
        <th style="padding:8px;text-align:right;font-size:12px;">Total</th>
      </tr></thead>
      <tbody>
        ${filas.join('') || filaTabla(['Sin filas', '—', '—', '—'])}
        ${filaTabla(['<strong>TOTAL</strong>', `<strong>${fmt(totalInv)}</strong>`, `<strong>${fmt(totalIgv)}</strong>`, `<strong>${fmt(totalFinal)}</strong>`])}
      </tbody>
    </table>
  `;
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host, { scale: 2, backgroundColor: '#ffffff' });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(host);
  }
}
