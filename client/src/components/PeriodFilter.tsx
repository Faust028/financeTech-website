import { CalendarDays } from 'lucide-react';
import { addDays, addMonths, monthEnd, monthStart, today } from '../lib/format';

export type Preset = 'today' | '7d' | 'month' | '30d' | 'lastMonth' | '6m' | 'year' | 'custom';
export interface Period {
  preset: Preset;
  from: string;
  to: string;
}

const LABELS: Record<Preset, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  month: 'Mês atual',
  '30d': '30 dias',
  lastMonth: 'Mês anterior',
  '6m': '6 meses',
  year: 'Ano atual',
  custom: 'Personalizado',
};

export function rangeFor(preset: Preset, current?: Period): Period {
  const t = today();
  switch (preset) {
    case 'today':
      return { preset, from: t, to: t };
    case '7d':
      return { preset, from: addDays(t, -6), to: t };
    case 'month':
      return { preset, from: monthStart(t), to: t };
    case '30d':
      return { preset, from: addDays(t, -29), to: t };
    case 'lastMonth': {
      const m = addMonths(t, -1);
      return { preset, from: m, to: monthEnd(m) };
    }
    case '6m':
      return { preset, from: addMonths(t, -5), to: monthEnd(t) };
    case 'year':
      return { preset, from: `${t.slice(0, 4)}-01-01`, to: `${t.slice(0, 4)}-12-31` };
    default:
      return { preset: 'custom', from: current?.from ?? monthStart(t), to: current?.to ?? t };
  }
}

export function PeriodFilter({
  value,
  onChange,
  presets = ['today', '7d', 'month', '30d', 'custom'],
}: {
  value: Period;
  onChange: (p: Period) => void;
  presets?: Preset[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="scrollbar-thin flex max-w-full overflow-x-auto rounded-xl border border-line bg-white p-1 shadow-card">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(rangeFor(p, value))}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition ${
              value.preset === p ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'
            }`}
          >
            {LABELS[p]}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex animate-fade-in items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1 shadow-card">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            aria-label="Data inicial"
            value={value.from}
            max={value.to}
            onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
            className="h-8 bg-transparent text-[13px] font-medium outline-none"
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            aria-label="Data final"
            value={value.to}
            min={value.from}
            onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
            className="h-8 bg-transparent text-[13px] font-medium outline-none"
          />
        </div>
      )}
    </div>
  );
}
