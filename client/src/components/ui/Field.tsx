import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { maskDocument, maskPhone } from '../../lib/format';

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-neg-600">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-neg-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, leading, className = '', ...rest }, ref) {
  if (leading)
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span>
        <input ref={ref} className={`field pl-9 ${invalid ? 'field-error' : ''} ${className}`} {...rest} />
      </div>
    );
  return <input ref={ref} className={`field ${invalid ? 'field-error' : ''} ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={`field appearance-none pr-9 ${invalid ? 'field-error' : ''} ${className}`} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} rows={3} className={`field h-auto py-2.5 ${invalid ? 'field-error' : ''} ${className}`} {...rest} />;
});

/** Campo monetário com máscara em Real: digitação da direita para a esquerda (centavos). */
export function MoneyInput({
  value,
  onChange,
  invalid,
  allowNegative,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  invalid?: boolean;
  allowNegative?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const negative = (value ?? 0) < 0;
  const display =
    value === null ? '' : Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">
        {negative ? '-R$' : 'R$'}
      </span>
      <input
        inputMode="numeric"
        className={`field num ${negative ? 'pl-12' : 'pl-10'} ${invalid ? 'field-error' : ''}`}
        value={display}
        placeholder="0,00"
        onKeyDown={(e) => {
          if (allowNegative && e.key === '-') {
            e.preventDefault();
            onChange(-(value ?? 0));
          }
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
          if (!digits) return onChange(null);
          const n = Number(digits.slice(0, 12)) / 100;
          onChange(negative ? -n : n);
        }}
        {...rest}
      />
    </div>
  );
}

export function DocumentInput({ value, onChange, invalid, ...rest }: { value: string; onChange: (v: string) => void; invalid?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      inputMode="numeric"
      className={`field num ${invalid ? 'field-error' : ''}`}
      placeholder="000.000.000-00 ou 00.000.000/0000-00"
      value={maskDocument(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 14))}
      {...rest}
    />
  );
}

export function PhoneInput({ value, onChange, invalid, ...rest }: { value: string; onChange: (v: string) => void; invalid?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      inputMode="tel"
      className={`field num ${invalid ? 'field-error' : ''}`}
      placeholder="(00) 00000-0000"
      value={maskPhone(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
      {...rest}
    />
  );
}
