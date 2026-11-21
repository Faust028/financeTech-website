import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from './Button';

export function PageHeader({ title, description, actions, icon }: { title: string; description?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card ring-1 ring-line sm:flex">{icon}</div>}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', title, action, subtitle }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: string; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h3 className="text-[15px] font-bold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = 'blue' | 'green' | 'red' | 'amber' | 'navy' | 'slate';
const toneMap: Record<Tone, { icon: string; badge: string }> = {
  blue: { icon: 'bg-brand-50 text-brand-600', badge: 'bg-brand-50 text-brand-700' },
  green: { icon: 'bg-pos-50 text-pos-600', badge: 'bg-pos-50 text-pos-700' },
  red: { icon: 'bg-neg-50 text-neg-600', badge: 'bg-neg-50 text-neg-700' },
  amber: { icon: 'bg-warn-50 text-warn-600', badge: 'bg-warn-50 text-warn-700' },
  navy: { icon: 'bg-navy-900 text-white', badge: 'bg-slate-100 text-navy-900' },
  slate: { icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-700' },
};

export function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  hint,
  change,
  invertChange,
  onClick,
  valueClass = '',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  change?: number | null;
  invertChange?: boolean;
  onClick?: () => void;
  valueClass?: string;
}) {
  const good = change !== null && change !== undefined && (invertChange ? change < 0 : change > 0);
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`card group flex flex-col p-5 text-left transition ${onClick ? 'hover:-translate-y-0.5 hover:shadow-pop' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneMap[tone].icon}`}>{icon}</span>
      </div>
      <div className={`num mt-3 text-[26px] leading-tight font-extrabold tracking-tight text-ink ${valueClass}`}>{value}</div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted">
        {change !== null && change !== undefined && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${good ? 'bg-pos-50 text-pos-700' : 'bg-neg-50 text-neg-700'}`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change > 0 ? '+' : ''}
            {change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </span>
        )}
        {hint}
      </div>
    </Comp>
  );
}

const badgeTones = {
  green: 'bg-pos-50 text-pos-700 ring-pos-600/15',
  red: 'bg-neg-50 text-neg-700 ring-neg-600/15',
  amber: 'bg-warn-50 text-warn-700 ring-warn-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};
export function Badge({ tone = 'slate', children, dot }: { tone?: keyof typeof badgeTones; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${badgeTones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof badgeTones, string]> = {
    RECEBIDO: ['green', 'Recebido'],
    PAGO: ['green', 'Pago'],
    PENDENTE: ['amber', 'Pendente'],
    ATRASADO: ['red', 'Atrasado'],
    OK: ['green', 'Normal'],
    BAIXO: ['amber', 'Baixo'],
    'SEM ESTOQUE': ['red', 'Sem estoque'],
    ENTRADA: ['green', 'Entrada'],
    SAIDA: ['red', 'Saída'],
  };
  const [tone, label] = map[status] ?? ['slate', status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      {label}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-8 ring-brand-50/50">{icon}</div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neg-50 text-neg-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-bold text-ink">Não foi possível carregar</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/** Tabela responsiva: rolagem horizontal dentro do card em telas pequenas. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, right, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return (
    <th className={`border-b border-line bg-slate-50/70 px-3 py-2.5 text-[11px] font-bold whitespace-nowrap tracking-wider text-slate-500 uppercase ${right ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </th>
  );
}
export function Td({ children, right, className = '' }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`border-b border-line/70 px-3 py-3 align-middle ${right ? 'text-right' : ''} ${className}`}>{children}</td>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${value === it.value ? 'bg-white text-ink shadow-card' : 'text-slate-500 hover:text-ink'}`}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
