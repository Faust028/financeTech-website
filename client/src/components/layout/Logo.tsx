export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="ft-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B7BF6" />
          <stop offset="1" stopColor="#1D4FD8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ft-g)" />
      <rect x="9" y="22" width="5" height="9" rx="1.5" fill="#fff" opacity=".55" />
      <rect x="17.5" y="16" width="5" height="15" rx="1.5" fill="#fff" opacity=".8" />
      <rect x="26" y="10" width="5" height="21" rx="1.5" fill="#fff" />
      <circle cx="31" cy="9" r="3" fill="#22C55E" stroke="#1D4FD8" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <span className={`text-[17px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          Finance<span className="text-brand-500">Tech</span>
        </span>
        <span className={`mt-1 block text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${light ? 'text-blue-200/60' : 'text-muted'}`}>Gestão financeira inteligente</span>
      </div>
    </div>
  );
}
