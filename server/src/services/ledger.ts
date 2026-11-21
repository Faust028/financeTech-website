import { prisma } from '../lib/prisma.js';
import { addDays, daysBetween, monthStart, todayStr, toStr } from '../lib/dates.js';
import { expenseStatus } from '../lib/serialize.js';
import { getSettings, type AppSettings } from './settings.js';

export interface LRevenue {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'RECEBIDO' | 'PENDENTE';
  clientId: number | null;
  clientName: string | null;
  paymentMethod: string;
}

export interface LExpense {
  id: number;
  description: string;
  amount: number;
  category: string;
  dueDate: string;
  paymentDate: string | null;
  status: 'PAGO' | 'PENDENTE' | 'ATRASADO';
  supplierId: number | null;
  supplierName: string | null;
  paymentMethod: string;
}

export interface CashEvent {
  date: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: number; // positivo para entrada, negativo para saída
  description: string;
  category: string;
  party: string | null;
  refId: number;
  paymentMethod: string;
}

export interface Ledger {
  settings: AppSettings;
  today: string;
  revenues: LRevenue[];
  expenses: LExpense[];
  events: CashEvent[];
  /** Saldo-base: saldo inicial descontado dos eventos anteriores à data do saldo inicial. */
  base: number;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const sum = <T>(arr: T[], f: (x: T) => number) => round2(arr.reduce((acc, x) => acc + f(x), 0));

/**
 * Carrega lançamentos e monta os eventos de caixa. Somente valores efetivamente
 * recebidos (receitas RECEBIDO) e pagos (despesas PAGO, pela data de pagamento)
 * geram movimentação de caixa. Lançamentos pendentes ficam fora do saldo.
 */
export async function loadLedger(): Promise<Ledger> {
  const today = todayStr();
  const [settings, revs, exps] = await Promise.all([
    getSettings(),
    prisma.revenue.findMany({ include: { client: { select: { name: true } } } }),
    prisma.expense.findMany({ include: { supplier: { select: { name: true } } } }),
  ]);

  const revenues: LRevenue[] = revs.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    category: r.category,
    date: toStr(r.date),
    status: r.status as LRevenue['status'],
    clientId: r.clientId,
    clientName: r.client?.name ?? null,
    paymentMethod: r.paymentMethod,
  }));

  const expenses: LExpense[] = exps.map((e) => {
    const dueDate = toStr(e.dueDate);
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      dueDate,
      paymentDate: e.paymentDate ? toStr(e.paymentDate) : null,
      status: expenseStatus(e.status, dueDate, today) as LExpense['status'],
      supplierId: e.supplierId,
      supplierName: e.supplier?.name ?? null,
      paymentMethod: e.paymentMethod,
    };
  });

  const events: CashEvent[] = [
    ...revenues
      .filter((r) => r.status === 'RECEBIDO')
      .map<CashEvent>((r) => ({
        date: r.date,
        type: 'ENTRADA',
        amount: r.amount,
        description: r.description,
        category: r.category,
        party: r.clientName,
        refId: r.id,
        paymentMethod: r.paymentMethod,
      })),
    ...expenses
      .filter((e) => e.status === 'PAGO' && e.paymentDate)
      .map<CashEvent>((e) => ({
        date: e.paymentDate!,
        type: 'SAIDA',
        amount: -e.amount,
        description: e.description,
        category: e.category,
        party: e.supplierName,
        refId: e.id,
        paymentMethod: e.paymentMethod,
      })),
  ].sort((a, b) => (a.date === b.date ? (a.type === b.type ? a.refId - b.refId : a.type === 'ENTRADA' ? -1 : 1) : a.date < b.date ? -1 : 1));

  const before = sum(
    events.filter((e) => e.date < settings.openingDate),
    (e) => e.amount,
  );
  return { settings, today, revenues, expenses, events, base: round2(settings.openingBalance - before) };
}

/** Saldo ao final do dia informado. */
export function balanceAt(L: Ledger, date: string): number {
  return round2(L.base + sum(L.events.filter((e) => e.date <= date), (e) => e.amount));
}

export const inRange = (d: string | null, from: string, to: string) => !!d && d >= from && d <= to;

export function receivedIn(L: Ledger, from: string, to: string) {
  return sum(
    L.revenues.filter((r) => r.status === 'RECEBIDO' && inRange(r.date, from, to)),
    (r) => r.amount,
  );
}
export function paidIn(L: Ledger, from: string, to: string) {
  return sum(
    L.expenses.filter((e) => e.status === 'PAGO' && inRange(e.paymentDate, from, to)),
    (e) => e.amount,
  );
}

export function groupSum<T>(arr: T[], key: (x: T) => string, val: (x: T) => number) {
  const map = new Map<string, number>();
  for (const x of arr) map.set(key(x), (map.get(key(x)) ?? 0) + val(x));
  return Array.from(map, ([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value);
}

/** Gera a série de saldo diário entre duas datas. */
export function dailyBalances(L: Ledger, from: string, to: string) {
  const out: { date: string; balance: number; in: number; out: number }[] = [];
  let bal = balanceAt(L, addDays(from, -1));
  const byDay = new Map<string, { in: number; out: number }>();
  for (const e of L.events) {
    if (e.date < from || e.date > to) continue;
    const d = byDay.get(e.date) ?? { in: 0, out: 0 };
    if (e.amount >= 0) d.in += e.amount;
    else d.out += -e.amount;
    byDay.set(e.date, d);
  }
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) {
    const date = addDays(from, i);
    const d = byDay.get(date) ?? { in: 0, out: 0 };
    bal = round2(bal + d.in - d.out);
    out.push({ date, balance: bal, in: round2(d.in), out: round2(d.out) });
  }
  return out;
}

/** Normaliza período: padrão = mês atual; garante from <= to e limita a ~5 anos. */
export function normalizeRange(from?: string, to?: string) {
  const today = todayStr();
  let f = from || monthStart(today);
  let t = to || today;
  if (f > t) [f, t] = [t, f];
  if (daysBetween(f, t) > 1830) f = addDays(t, -1830);
  return { from: f, to: t };
}

export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return round2(((curr - prev) / Math.abs(prev)) * 100);
}
