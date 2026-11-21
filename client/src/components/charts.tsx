import type { ReactNode } from 'react';
import { money, moneyCompact } from '../lib/format';

export const COLORS = {
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  navy: '#142B4A',
  amber: '#D97706',
  grid: '#EEF1F5',
  axis: '#94A3B8',
};

/** Paleta categórica para gráficos de pizza (tons coerentes com a marca). */
export const CATEGORY_COLORS = ['#2563EB', '#142B4A', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#64748B', '#65A30D'];

export const axisProps = {
  tick: { fontSize: 11, fill: COLORS.axis },
  tickLine: false,
  axisLine: false,
} as const;

/** Rótulo compacto para eixos (espaços não separáveis evitam quebra de linha no SVG). */
const tickFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
export const moneyTick = (v: number) => (Math.abs(v) >= 1000 ? tickFmt.format(v) : moneyCompact(v)).replace(/\s/g, ' ');

interface TooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[];
  label?: ReactNode;
  formatter?: (v: number) => string;
}

export function ChartTooltip({ active, payload, label, formatter = money }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-white/95 px-3.5 py-2.5 text-xs shadow-pop backdrop-blur">
      {label !== undefined && label !== '' && <p className="mb-1.5 font-bold text-ink">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="num font-semibold text-ink">{formatter(Number(p.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
