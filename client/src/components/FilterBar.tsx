import type { ReactNode } from 'react';
import { FilterX, Search } from 'lucide-react';
import { Button } from './ui/Button';

export function SearchInput({ value, onChange, placeholder = 'Pesquisar...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field pl-9" aria-label={placeholder} />
    </div>
  );
}

export function FilterBar({ children, onClear, canClear }: { children: ReactNode; onClear?: () => void; canClear?: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line p-4 lg:flex-row lg:flex-wrap lg:items-center">
      {children}
      {onClear && canClear && (
        <Button variant="ghost" size="sm" icon={<FilterX className="h-4 w-4" />} onClick={onClear} className="lg:ml-auto">
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, children, label }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="field w-full lg:w-auto lg:min-w-[150px]">
      {children}
    </select>
  );
}

export function DateRangeInputs({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} className="field w-full lg:w-[150px]" aria-label="Data inicial" />
      <span className="text-xs text-muted">até</span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} className="field w-full lg:w-[150px]" aria-label="Data final" />
    </div>
  );
}
