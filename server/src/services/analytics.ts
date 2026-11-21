import { prisma } from '../lib/prisma.js';
import { addDays, addMonths, brDate, daysBetween, monthEnd, monthLabel, monthsBetween, monthStart } from '../lib/dates.js';
import { serializeProduct } from '../lib/serialize.js';
import {
  balanceAt,
  dailyBalances,
  groupSum,
  inRange,
  loadLedger,
  paidIn,
  pctChange,
  receivedIn,
  round2,
  sum,
  type Ledger,
} from './ledger.js';
import { buildInsights } from './insights.js';

function monthlySeries(L: Ledger, months: string[]) {
  return months.map((m) => {
    const end = monthEnd(m);
    const receitas = receivedIn(L, m, end);
    const despesas = paidIn(L, m, end);
    return {
      month: m,
      label: monthLabel(m),
      receitas,
      despesas,
      lucro: round2(receitas - despesas),
      margem: receitas > 0 ? round2(((receitas - despesas) / receitas) * 100) : null,
      saldo: balanceAt(L, end < L.today ? end : L.today),
    };
  });
}

export async function getDashboard(from: string, to: string) {
  const L = await loadLedger();
  const { today, settings } = L;

  const received = receivedIn(L, from, to);
  const paid = paidIn(L, from, to);
  const pendingRevenue = sum(
    L.revenues.filter((r) => r.status === 'PENDENTE' && inRange(r.date, from, to)),
    (r) => r.amount,
  );
  const pendingExpense = sum(
    L.expenses.filter((e) => e.status !== 'PAGO' && inRange(e.dueDate, from, to)),
    (e) => e.amount,
  );

  const len = daysBetween(from, to) + 1;
  const pFrom = addDays(from, -len);
  const pTo = addDays(from, -1);
  const prevReceived = receivedIn(L, pFrom, pTo);
  const prevPaid = paidIn(L, pFrom, pTo);

  const openExp = L.expenses.filter((e) => e.status !== 'PAGO');
  const overdueExp = openExp.filter((e) => e.status === 'ATRASADO');
  const soonLimit = addDays(today, settings.dueSoonDays);
  const dueSoon = openExp.filter((e) => e.status === 'PENDENTE' && e.dueDate <= soonLimit);
  const openRev = L.revenues.filter((r) => r.status === 'PENDENTE');
  const lateRev = openRev.filter((r) => r.date < today);

  const products = await prisma.product.findMany({ include: { supplier: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } });
  const lowStock = products
    .map(serializeProduct)
    .filter((p) => p.lowStock)
    .sort((a, b) => a.quantity - a.minStock - (b.quantity - b.minStock));

  const months = monthsBetween(addMonths(monthStart(today), -5), today);
  const seriesFrom = len < 7 ? addDays(to, -6) : from;

  const recent = [
    ...L.revenues.map((r) => ({ kind: 'RECEITA' as const, id: r.id, date: r.date, description: r.description, category: r.category, amount: r.amount, status: r.status, party: r.clientName })),
    ...L.expenses.map((e) => ({ kind: 'DESPESA' as const, id: e.id, date: e.paymentDate ?? e.dueDate, description: e.description, category: e.category, amount: e.amount, status: e.status, party: e.supplierName })),
  ]
    .filter((x) => x.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    .slice(0, 7);

  const insights = await buildInsights(L);

  return {
    range: { from, to, previousFrom: pFrom, previousTo: pTo },
    company: settings.companyName,
    isDemo: settings.isDemo,
    balance: balanceAt(L, today),
    balanceAtRangeStart: balanceAt(L, addDays(from, -1)),
    period: {
      received,
      paid,
      profit: round2(received - paid),
      pendingRevenue,
      pendingExpense,
      receivedChange: pctChange(received, prevReceived),
      paidChange: pctChange(paid, prevPaid),
      profitChange: pctChange(received - paid, prevReceived - prevPaid),
    },
    payables: {
      total: sum(openExp, (e) => e.amount),
      count: openExp.length,
      overdueCount: overdueExp.length,
      overdueTotal: sum(overdueExp, (e) => e.amount),
      dueSoonCount: dueSoon.length,
      dueSoonTotal: sum(dueSoon, (e) => e.amount),
      dueSoonDays: settings.dueSoonDays,
    },
    receivables: {
      total: sum(openRev, (r) => r.amount),
      count: openRev.length,
      lateCount: lateRev.length,
      lateTotal: sum(lateRev, (r) => r.amount),
    },
    stock: {
      lowCount: lowStock.length,
      products: products.length,
      value: round2(products.reduce((a, p) => a + Math.max(0, p.quantity) * p.costPrice, 0)),
      lowItems: lowStock.slice(0, 6).map((p) => ({ id: p.id, name: p.name, sku: p.sku, quantity: p.quantity, minStock: p.minStock })),
    },
    monthly: monthlySeries(L, months),
    balanceSeries: dailyBalances(L, seriesFrom, to).map((d) => ({ date: d.date, label: brDate(d.date).slice(0, 5), saldo: d.balance })),
    expensesByCategory: groupSum(
      L.expenses.filter((e) => e.status === 'PAGO' && inRange(e.paymentDate, from, to)),
      (e) => e.category,
      (e) => e.amount,
    ),
    upcoming: openExp
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
      .slice(0, 6)
      .map((e) => ({ id: e.id, description: e.description, amount: e.amount, dueDate: e.dueDate, status: e.status, supplier: e.supplierName, daysToDue: daysBetween(today, e.dueDate) })),
    recent,
    insights: insights.slice(0, 4),
  };
}

type Granularity = 'day' | 'week' | 'month';

function bucketKey(date: string, g: Granularity) {
  if (g === 'day') return date;
  if (g === 'month') return monthStart(date);
  const d = new Date(`${date}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  return addDays(date, -dow);
}

export async function getCashflow(from: string, to: string, granularity?: Granularity) {
  const L = await loadLedger();
  const days = daysBetween(from, to) + 1;
  const g: Granularity = granularity ?? (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');
  const opening = balanceAt(L, addDays(from, -1));
  const daily = dailyBalances(L, from, to);

  // agrupamento por período
  const buckets = new Map<string, { start: string; end: string; in: number; out: number; opening: number; closing: number; minBalance: number }>();
  for (const d of daily) {
    const k = bucketKey(d.date, g);
    let b = buckets.get(k);
    if (!b) {
      b = { start: d.date, end: d.date, in: 0, out: 0, opening: round2(d.balance - d.in + d.out), closing: d.balance, minBalance: d.balance };
      buckets.set(k, b);
    }
    b.end = d.date;
    b.in = round2(b.in + d.in);
    b.out = round2(b.out + d.out);
    b.closing = d.balance;
    b.minBalance = Math.min(b.minBalance, d.balance);
  }
  const periods = Array.from(buckets, ([key, b]) => ({
    key,
    label: g === 'month' ? monthLabel(key) : g === 'week' ? `${brDate(b.start).slice(0, 5)}–${brDate(b.end).slice(0, 5)}` : brDate(key).slice(0, 5),
    start: b.start,
    end: b.end,
    entradas: b.in,
    saidas: b.out,
    resultado: round2(b.in - b.out),
    saldoInicial: b.opening,
    saldoFinal: b.closing,
    negative: b.minBalance < 0,
  }));

  let running = opening;
  const movements = L.events
    .filter((e) => inRange(e.date, from, to))
    .map((e) => {
      running = round2(running + e.amount);
      return { ...e, balance: running };
    });

  const negativeDays = daily.filter((d) => d.balance < 0);
  const pendingIn = L.revenues.filter((r) => r.status === 'PENDENTE' && inRange(r.date, from, to));
  const pendingOut = L.expenses.filter((e) => e.status !== 'PAGO' && inRange(e.dueDate, from, to));

  return {
    range: { from, to },
    granularity: g,
    opening,
    totalIn: sum(daily, (d) => d.in),
    totalOut: sum(daily, (d) => d.out),
    closing: daily.length ? daily[daily.length - 1].balance : opening,
    minBalance: daily.length ? Math.min(...daily.map((d) => d.balance)) : opening,
    negativeDays: negativeDays.length,
    firstNegativeDate: negativeDays[0]?.date ?? null,
    periods,
    movements: movements.reverse(),
    forecast: {
      toReceive: sum(pendingIn, (r) => r.amount),
      toReceiveCount: pendingIn.length,
      toPay: sum(pendingOut, (e) => e.amount),
      toPayCount: pendingOut.length,
    },
  };
}

/* ------------------------------ Relatórios ------------------------------ */

type Fmt = 'text' | 'money' | 'date' | 'number' | 'percent' | 'status';
interface Column {
  key: string;
  label: string;
  format?: Fmt;
  align?: 'right';
}
interface ReportResult {
  type: string;
  title: string;
  subtitle: string;
  summary: { label: string; value: number; format: Fmt; tone?: 'positive' | 'negative' | 'neutral' }[];
  chart: { kind: 'bar' | 'pie' | 'line' | 'composed'; data: Record<string, unknown>[]; series: { key: string; label: string; color: string }[]; xKey: string } | null;
  columns: Column[];
  rows: object[];
  totals?: Record<string, unknown>;
}

const C = { blue: '#2563EB', green: '#16A34A', red: '#DC2626', navy: '#142B4A', amber: '#D97706' };

export const REPORT_TYPES = ['receitas', 'despesas', 'lucro', 'fluxo', 'estoque', 'comparativo'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export async function getReport(type: ReportType, from: string, to: string, category?: string): Promise<ReportResult> {
  const L = await loadLedger();
  const subtitle = `Período: ${brDate(from)} a ${brDate(to)}${category ? ` · Categoria: ${category}` : ''}`;
  const byCat = (c: string) => !category || c === category;

  if (type === 'receitas') {
    const rows = L.revenues.filter((r) => inRange(r.date, from, to) && byCat(r.category)).sort((a, b) => (a.date < b.date ? -1 : 1));
    const total = sum(rows, (r) => r.amount);
    const received = sum(rows.filter((r) => r.status === 'RECEBIDO'), (r) => r.amount);
    return {
      type,
      title: 'Relatório de Receitas',
      subtitle,
      summary: [
        { label: 'Total lançado', value: total, format: 'money' },
        { label: 'Recebido', value: received, format: 'money', tone: 'positive' },
        { label: 'Pendente', value: round2(total - received), format: 'money', tone: 'neutral' },
        { label: 'Ticket médio', value: rows.length ? round2(total / rows.length) : 0, format: 'money' },
      ],
      chart: { kind: 'bar', xKey: 'name', data: groupSum(rows, (r) => r.category, (r) => r.amount), series: [{ key: 'value', label: 'Receitas', color: C.green }] },
      columns: [
        { key: 'date', label: 'Data', format: 'date' },
        { key: 'description', label: 'Descrição' },
        { key: 'category', label: 'Categoria' },
        { key: 'clientName', label: 'Cliente' },
        { key: 'paymentMethod', label: 'Forma' },
        { key: 'status', label: 'Status', format: 'status' },
        { key: 'amount', label: 'Valor', format: 'money', align: 'right' },
      ],
      rows,
      totals: { description: `${rows.length} lançamento(s)`, amount: total },
    };
  }

  if (type === 'despesas') {
    const rows = L.expenses.filter((e) => inRange(e.dueDate, from, to) && byCat(e.category)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const total = sum(rows, (e) => e.amount);
    const paid = sum(rows.filter((e) => e.status === 'PAGO'), (e) => e.amount);
    const overdue = sum(rows.filter((e) => e.status === 'ATRASADO'), (e) => e.amount);
    return {
      type,
      title: 'Relatório de Despesas',
      subtitle,
      summary: [
        { label: 'Total lançado', value: total, format: 'money' },
        { label: 'Pago', value: paid, format: 'money', tone: 'negative' },
        { label: 'Pendente', value: round2(total - paid - overdue), format: 'money', tone: 'neutral' },
        { label: 'Atrasado', value: overdue, format: 'money', tone: 'negative' },
      ],
      chart: { kind: 'pie', xKey: 'name', data: groupSum(rows, (e) => e.category, (e) => e.amount), series: [{ key: 'value', label: 'Despesas', color: C.red }] },
      columns: [
        { key: 'dueDate', label: 'Vencimento', format: 'date' },
        { key: 'paymentDate', label: 'Pagamento', format: 'date' },
        { key: 'description', label: 'Descrição' },
        { key: 'category', label: 'Categoria' },
        { key: 'supplierName', label: 'Fornecedor' },
        { key: 'status', label: 'Status', format: 'status' },
        { key: 'amount', label: 'Valor', format: 'money', align: 'right' },
      ],
      rows,
      totals: { description: `${rows.length} lançamento(s)`, amount: total },
    };
  }

  if (type === 'lucro' || type === 'comparativo') {
    const months = monthsBetween(from, to);
    const rows = months.map((m, i) => {
      const s = m < from ? from : m;
      const e = monthEnd(m) > to ? to : monthEnd(m);
      const receitas = sum(L.revenues.filter((r) => r.status === 'RECEBIDO' && inRange(r.date, s, e) && byCat(r.category)), (r) => r.amount);
      const despesas = sum(L.expenses.filter((x) => x.status === 'PAGO' && inRange(x.paymentDate, s, e) && byCat(x.category)), (x) => x.amount);
      return { month: m, label: monthLabel(m), i, receitas, despesas, lucro: round2(receitas - despesas), margem: receitas > 0 ? round2(((receitas - despesas) / receitas) * 100) : null };
    });
    const withVar = rows.map((r, i) => ({
      ...r,
      varReceitas: i > 0 ? pctChange(r.receitas, rows[i - 1].receitas) : null,
      varDespesas: i > 0 ? pctChange(r.despesas, rows[i - 1].despesas) : null,
      varLucro: i > 0 ? pctChange(r.lucro, rows[i - 1].lucro) : null,
    }));
    const tr = sum(rows, (r) => r.receitas);
    const td = sum(rows, (r) => r.despesas);
    if (type === 'lucro') {
      return {
        type,
        title: 'Relatório de Lucro ou Prejuízo',
        subtitle: `${subtitle} · Regime de caixa (valores recebidos e pagos)`,
        summary: [
          { label: 'Receitas recebidas', value: tr, format: 'money', tone: 'positive' },
          { label: 'Despesas pagas', value: td, format: 'money', tone: 'negative' },
          { label: tr - td >= 0 ? 'Lucro' : 'Prejuízo', value: round2(tr - td), format: 'money', tone: tr - td >= 0 ? 'positive' : 'negative' },
          { label: 'Margem', value: tr > 0 ? round2(((tr - td) / tr) * 100) : 0, format: 'percent' },
        ],
        chart: {
          kind: 'composed',
          xKey: 'label',
          data: rows,
          series: [
            { key: 'receitas', label: 'Receitas', color: C.green },
            { key: 'despesas', label: 'Despesas', color: C.red },
            { key: 'lucro', label: 'Lucro', color: C.blue },
          ],
        },
        columns: [
          { key: 'label', label: 'Mês' },
          { key: 'receitas', label: 'Receitas', format: 'money', align: 'right' },
          { key: 'despesas', label: 'Despesas', format: 'money', align: 'right' },
          { key: 'lucro', label: 'Resultado', format: 'money', align: 'right' },
          { key: 'margem', label: 'Margem', format: 'percent', align: 'right' },
        ],
        rows,
        totals: { label: 'Total', receitas: tr, despesas: td, lucro: round2(tr - td), margem: tr > 0 ? round2(((tr - td) / tr) * 100) : null },
      };
    }
    const best = [...rows].sort((a, b) => b.lucro - a.lucro)[0];
    const worst = [...rows].sort((a, b) => a.lucro - b.lucro)[0];
    return {
      type,
      title: 'Comparativo entre Meses',
      subtitle,
      summary: [
        { label: 'Média de receitas/mês', value: rows.length ? round2(tr / rows.length) : 0, format: 'money', tone: 'positive' },
        { label: 'Média de despesas/mês', value: rows.length ? round2(td / rows.length) : 0, format: 'money', tone: 'negative' },
        { label: `Melhor mês${best ? ` (${best.label})` : ''}`, value: best?.lucro ?? 0, format: 'money', tone: 'positive' },
        { label: `Pior mês${worst ? ` (${worst.label})` : ''}`, value: worst?.lucro ?? 0, format: 'money', tone: (worst?.lucro ?? 0) < 0 ? 'negative' : 'neutral' },
      ],
      chart: {
        kind: 'bar',
        xKey: 'label',
        data: rows,
        series: [
          { key: 'receitas', label: 'Receitas', color: C.green },
          { key: 'despesas', label: 'Despesas', color: C.red },
        ],
      },
      columns: [
        { key: 'label', label: 'Mês' },
        { key: 'receitas', label: 'Receitas', format: 'money', align: 'right' },
        { key: 'varReceitas', label: 'Var. receitas', format: 'percent', align: 'right' },
        { key: 'despesas', label: 'Despesas', format: 'money', align: 'right' },
        { key: 'varDespesas', label: 'Var. despesas', format: 'percent', align: 'right' },
        { key: 'lucro', label: 'Resultado', format: 'money', align: 'right' },
        { key: 'varLucro', label: 'Var. resultado', format: 'percent', align: 'right' },
      ],
      rows: withVar,
      totals: { label: 'Total', receitas: tr, despesas: td, lucro: round2(tr - td) },
    };
  }

  if (type === 'fluxo') {
    const cf = await getCashflow(from, to, daysBetween(from, to) <= 62 ? 'day' : 'month');
    const rows = cf.periods;
    return {
      type,
      title: 'Relatório de Fluxo de Caixa',
      subtitle: `Período: ${brDate(from)} a ${brDate(to)} · Somente valores efetivamente recebidos e pagos`,
      summary: [
        { label: 'Saldo inicial', value: cf.opening, format: 'money' },
        { label: 'Entradas', value: cf.totalIn, format: 'money', tone: 'positive' },
        { label: 'Saídas', value: cf.totalOut, format: 'money', tone: 'negative' },
        { label: 'Saldo final', value: cf.closing, format: 'money', tone: cf.closing >= 0 ? 'positive' : 'negative' },
      ],
      chart: {
        kind: 'composed',
        xKey: 'label',
        data: rows,
        series: [
          { key: 'entradas', label: 'Entradas', color: C.green },
          { key: 'saidas', label: 'Saídas', color: C.red },
          { key: 'saldoFinal', label: 'Saldo', color: C.blue },
        ],
      },
      columns: [
        { key: 'label', label: 'Período' },
        { key: 'saldoInicial', label: 'Saldo inicial', format: 'money', align: 'right' },
        { key: 'entradas', label: 'Entradas', format: 'money', align: 'right' },
        { key: 'saidas', label: 'Saídas', format: 'money', align: 'right' },
        { key: 'resultado', label: 'Resultado', format: 'money', align: 'right' },
        { key: 'saldoFinal', label: 'Saldo final', format: 'money', align: 'right' },
      ],
      rows,
      totals: { label: 'Total', saldoInicial: cf.opening, entradas: cf.totalIn, saidas: cf.totalOut, resultado: round2(cf.totalIn - cf.totalOut), saldoFinal: cf.closing },
    };
  }

  // estoque
  const products = (await prisma.product.findMany({ include: { supplier: { select: { id: true, name: true } } }, orderBy: { name: 'asc' } }))
    .map(serializeProduct)
    .filter((p) => byCat(p.category));
  const rows = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    supplier: p.supplier?.name ?? null,
    quantity: p.quantity,
    minStock: p.minStock,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    totalCost: round2(Math.max(0, p.quantity) * p.costPrice),
    totalSale: round2(Math.max(0, p.quantity) * p.salePrice),
    status: p.quantity <= 0 ? 'SEM ESTOQUE' : p.lowStock ? 'BAIXO' : 'OK',
  }));
  const totalCost = sum(rows, (r) => r.totalCost);
  const totalSale = sum(rows, (r) => r.totalSale);
  return {
    type,
    title: 'Relatório de Estoque',
    subtitle: `Posição atual${category ? ` · Categoria: ${category}` : ''}`,
    summary: [
      { label: 'Itens em estoque', value: sum(rows, (r) => Math.max(0, r.quantity)), format: 'number' },
      { label: 'Valor pelo custo', value: totalCost, format: 'money' },
      { label: 'Valor de venda', value: totalSale, format: 'money', tone: 'positive' },
      { label: 'Produtos com estoque baixo', value: rows.filter((r) => r.status !== 'OK').length, format: 'number', tone: 'negative' },
    ],
    chart: { kind: 'bar', xKey: 'name', data: groupSum(rows, (r) => r.category, (r) => r.totalCost), series: [{ key: 'value', label: 'Valor em estoque (custo)', color: C.navy }] },
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Produto' },
      { key: 'category', label: 'Categoria' },
      { key: 'quantity', label: 'Qtd.', format: 'number', align: 'right' },
      { key: 'minStock', label: 'Mín.', format: 'number', align: 'right' },
      { key: 'costPrice', label: 'Custo un.', format: 'money', align: 'right' },
      { key: 'salePrice', label: 'Venda un.', format: 'money', align: 'right' },
      { key: 'totalCost', label: 'Total custo', format: 'money', align: 'right' },
      { key: 'status', label: 'Situação', format: 'status' },
    ],
    rows,
    totals: { name: `${rows.length} produto(s)`, totalCost },
  };
}
