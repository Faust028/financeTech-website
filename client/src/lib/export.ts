import type { Fmt, Report } from './types';
import { date, money, number, percent } from './format';

const STATUS_LABEL: Record<string, string> = {
  RECEBIDO: 'Recebido',
  PAGO: 'Pago',
  PENDENTE: 'Pendente',
  ATRASADO: 'Atrasado',
  OK: 'Normal',
  BAIXO: 'Baixo',
  'SEM ESTOQUE': 'Sem estoque',
};

export function formatCell(v: unknown, fmt?: Fmt): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (fmt) {
    case 'money':
      return money(Number(v));
    case 'date':
      return date(String(v));
    case 'number':
      return number(Number(v));
    case 'percent':
      return percent(Number(v));
    case 'status':
      return STATUS_LABEL[String(v)] ?? String(v);
    default:
      return String(v);
  }
}

const fileName = (r: Report, ext: string) => `FinanceTech_${r.title.replace(/[^\p{L}\p{N}]+/gu, '_')}_${new Date().toISOString().slice(0, 10)}.${ext}`;

export async function exportPDF(report: Report, company: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const landscape = report.columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 36;

  // Cabeçalho
  doc.setFillColor(20, 43, 74);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FinanceTech', M, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(company, M, 46);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, W - M, 46, { align: 'right' });

  doc.setTextColor(15, 29, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(report.title, M, 92);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(report.subtitle, M, 108);

  // Resumo
  let y = 124;
  const boxW = (W - M * 2 - 8 * (report.summary.length - 1)) / report.summary.length;
  report.summary.forEach((s, i) => {
    const x = M + i * (boxW + 8);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y, boxW, 48, 6, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, x + 10, y + 17, { maxWidth: boxW - 20 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const c = s.tone === 'positive' ? [21, 128, 61] : s.tone === 'negative' ? [220, 38, 38] : [15, 29, 51];
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(formatCell(s.value, s.format), x + 10, y + 37);
    doc.setFont('helvetica', 'normal');
  });
  y += 64;

  // Gráfico simples de barras (barras agrupadas por série)
  if (report.chart && report.chart.data.length && report.chart.kind !== 'pie') {
    const chart = report.chart;
    const series = chart.series.slice(0, 3);
    const data = chart.data.slice(0, 24);
    const h = 130;
    const cw = W - M * 2;
    const values = data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0)));
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const zeroY = y + h * (max / span);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, zeroY, M + cw, zeroY);
    const groupW = cw / data.length;
    const barW = Math.min(18, (groupW * 0.7) / series.length);
    data.forEach((d, i) => {
      const gx = M + i * groupW + (groupW - barW * series.length) / 2;
      series.forEach((s, j) => {
        const v = Number(d[s.key] ?? 0);
        const bh = (Math.abs(v) / span) * h;
        const hex = s.color.replace('#', '');
        doc.setFillColor(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
        doc.rect(gx + j * barW, v >= 0 ? zeroY - bh : zeroY, barW - 1, Math.max(bh, 0.5), 'F');
      });
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(d[chart.xKey] ?? '').slice(0, 14), M + i * groupW + groupW / 2, y + h + 12, { align: 'center' });
    });
    // legenda
    let lx = M;
    series.forEach((s) => {
      const hex = s.color.replace('#', '');
      doc.setFillColor(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
      doc.rect(lx, y + h + 22, 8, 8, 'F');
      doc.setFontSize(8);
      doc.text(s.label, lx + 12, y + h + 29);
      lx += doc.getTextWidth(s.label) + 30;
    });
    y += h + 44;
  }

  // Tabela
  const body = report.rows.map((r) => report.columns.map((c) => formatCell(r[c.key], c.format)));
  const foot = report.totals ? [report.columns.map((c) => (report.totals![c.key] !== undefined ? formatCell(report.totals![c.key], c.format === 'status' ? 'text' : c.format) : ''))] : undefined;
  autoTable(doc, {
    startY: y,
    head: [report.columns.map((c) => c.label)],
    body,
    foot,
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 5, textColor: [15, 29, 51], lineColor: [230, 234, 240], lineWidth: 0.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 29, 51], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    columnStyles: Object.fromEntries(report.columns.map((c, i) => [i, { halign: c.align === 'right' ? 'right' : 'left' }])),
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`FinanceTech · ${report.title} · página ${doc.getNumberOfPages()}`, W / 2, H - 16, { align: 'center' });
    },
  });

  doc.save(fileName(report, 'pdf'));
}

export async function exportExcel(report: Report, company: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary: (string | number)[][] = [
    ['FinanceTech', company],
    [report.title],
    [report.subtitle],
    [],
    ['Indicador', 'Valor'],
    ...report.summary.map((s) => [s.label, s.format === 'percent' ? s.value / 100 : s.value]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  report.summary.forEach((s, i) => {
    const cell = ws1[XLSX.utils.encode_cell({ r: 5 + i, c: 1 })];
    if (cell) cell.z = s.format === 'money' ? '"R$" #,##0.00' : s.format === 'percent' ? '0.0%' : '#,##0';
  });
  ws1['!cols'] = [{ wch: 34 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

  const header = report.columns.map((c) => c.label);
  const toCell = (v: unknown, f?: Fmt) => {
    if (v === null || v === undefined) return '';
    if (f === 'money' || f === 'number') return Number(v);
    if (f === 'percent') return Number(v) / 100;
    if (f === 'date') return date(String(v));
    if (f === 'status') return formatCell(v, 'status');
    return String(v);
  };
  const rows = report.rows.map((r) => report.columns.map((c) => toCell(r[c.key], c.format)));
  if (report.totals) rows.push(report.columns.map((c) => (report.totals![c.key] !== undefined ? toCell(report.totals![c.key], c.format === 'status' ? 'text' : c.format) : '')));
  const ws2 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  report.columns.forEach((c, ci) => {
    if (c.format !== 'money' && c.format !== 'percent') return;
    for (let ri = 1; ri <= rows.length; ri++) {
      const cell = ws2[XLSX.utils.encode_cell({ r: ri, c: ci })];
      if (cell && typeof cell.v === 'number') cell.z = c.format === 'money' ? '"R$" #,##0.00' : '0.0%';
    }
  });
  ws2['!cols'] = report.columns.map((c) => ({ wch: Math.max(c.label.length + 2, c.key === 'description' || c.key === 'name' ? 38 : 14) }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Dados');

  XLSX.writeFile(wb, fileName(report, 'xlsx'));
}
