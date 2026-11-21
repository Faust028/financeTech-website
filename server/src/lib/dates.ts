/**
 * Datas de negócio são tratadas como dias de calendário (YYYY-MM-DD) e gravadas
 * como meia-noite UTC, evitando deslocamentos de fuso horário.
 */
export const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Data de hoje no fuso do negócio (padrão: America/Sao_Paulo).
 * Servidores na nuvem (ex.: Vercel) rodam em UTC; sem isso, entre 21h e 0h
 * o sistema consideraria o dia seguinte para vencimentos e atrasos.
 */
const APP_TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
const dayFormatter = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  }
})();

export function todayStr(): string {
  return dayFormatter.format(new Date()); // en-CA => YYYY-MM-DD
}

export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const toStr = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(s: string, n: number): string {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}

export function addMonths(s: string, n: number): string {
  const d = toDate(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toStr(d);
}

export const monthStart = (s: string) => `${s.slice(0, 7)}-01`;
export function monthEnd(s: string): string {
  const d = toDate(monthStart(s));
  return toStr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthLabel = (s: string) => `${MONTHS[Number(s.slice(5, 7)) - 1]}/${s.slice(2, 4)}`;
export const monthLongLabel = (s: string) => `${MONTHS_LONG[Number(s.slice(5, 7)) - 1]} de ${s.slice(0, 4)}`;
export const brDate = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

export const isDateStr = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());

/** Lista os meses (primeiro dia) entre duas datas, inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let m = monthStart(from);
  while (m <= to) {
    out.push(m);
    m = addMonths(m, 1);
  }
  return out;
}
