import React, { useMemo } from 'react';

function parseInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Renderizado ligero de markdown de manuales (títulos, listas, tablas, párrafos).
 */
export default function ManualMarkdown({ markdown, className = '' }) {
  const blocks = useMemo(() => {
    if (!markdown) return [];
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let tableRows = [];

    const flushTable = () => {
      if (tableRows.length < 1) return;
      const rows = tableRows.filter((r) => !/^\|[\s\-:|]+\|$/.test(r.trim()));
      const parsed = rows.map((r) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      );
      if (parsed.length) out.push({ type: 'table', rows: parsed });
      tableRows = [];
    };

    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('|') && line.includes('|', 1)) {
        tableRows.push(line);
        i += 1;
        continue;
      }
      flushTable();

      if (line.startsWith('# ')) {
        out.push({ type: 'h1', text: line.slice(2).trim() });
      } else if (line.startsWith('## ')) {
        out.push({ type: 'h2', text: line.slice(3).trim() });
      } else if (line.startsWith('### ')) {
        out.push({ type: 'h3', text: line.slice(4).trim() });
      } else if (line.trim() === '---') {
        out.push({ type: 'hr' });
      } else if (/^\d+\.\s/.test(line.trim())) {
        out.push({ type: 'ol', text: line.trim().replace(/^\d+\.\s*/, '') });
      } else if (line.startsWith('- ')) {
        out.push({ type: 'ul', text: line.slice(2).trim() });
      } else if (line.trim()) {
        out.push({ type: 'p', text: line.trim() });
      }
      i += 1;
    }
    flushTable();
    return out;
  }, [markdown]);

  return (
    <div className={`manual-markdown text-slate-700 text-sm leading-relaxed space-y-3 ${className}`}>
      {blocks.map((b, idx) => {
        if (b.type === 'h1') {
          return (
            <h1 key={idx} className="text-xl font-bold text-slate-900 pt-2">
              {parseInline(b.text)}
            </h1>
          );
        }
        if (b.type === 'h2') {
          return (
            <h2 key={idx} className="text-base font-bold text-teal-800 mt-4 border-b border-teal-100 pb-1">
              {parseInline(b.text)}
            </h2>
          );
        }
        if (b.type === 'h3') {
          return (
            <h3 key={idx} className="text-sm font-semibold text-slate-800 mt-2">
              {parseInline(b.text)}
            </h3>
          );
        }
        if (b.type === 'hr') {
          return <hr key={idx} className="border-slate-200" />;
        }
        if (b.type === 'ul') {
          return (
            <li key={idx} className="ml-4 list-disc">
              {parseInline(b.text)}
            </li>
          );
        }
        if (b.type === 'ol') {
          return (
            <li key={idx} className="ml-4 list-decimal">
              {parseInline(b.text)}
            </li>
          );
        }
        if (b.type === 'table') {
          const [head, ...body] = b.rows;
          return (
            <div key={idx} className="overflow-x-auto rounded-lg border border-slate-200 my-3">
              <table className="min-w-full text-xs">
                {head ? (
                  <thead className="bg-teal-50 text-teal-900">
                    <tr>
                      {head.map((c, j) => (
                        <th key={j} className="px-3 py-2 text-left font-semibold">
                          {parseInline(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : null}
                <tbody className="divide-y divide-slate-100">
                  {body.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => (
                        <td key={ci} className="px-3 py-2 align-top">
                          {parseInline(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={idx} className="text-slate-600">
            {parseInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}
