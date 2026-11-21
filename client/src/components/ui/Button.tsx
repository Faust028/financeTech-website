import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success' | 'soft';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 focus-visible:ring-brand-200',
  secondary: 'border border-line bg-white text-ink hover:bg-slate-50 focus-visible:ring-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink focus-visible:ring-slate-200',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-100',
  danger: 'bg-neg-600 text-white hover:bg-neg-700 focus-visible:ring-neg-100',
  warning: 'bg-warn-600 text-white hover:bg-warn-700 focus-visible:ring-warn-100',
  success: 'bg-pos-600 text-white hover:bg-pos-700 focus-visible:ring-pos-100',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  icon: 'h-8 w-8 rounded-lg justify-center',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition duration-150 outline-none focus-visible:ring-4 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
