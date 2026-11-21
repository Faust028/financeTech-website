import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CircleAlert, Lightbulb, TrendingUp } from 'lucide-react';
import type { Insight } from '../lib/types';

const TONES = {
  positive: { wrap: 'border-pos-600/15 bg-pos-50/60', icon: 'bg-pos-600 text-white', Icon: TrendingUp, label: 'Positivo' },
  negative: { wrap: 'border-neg-600/15 bg-neg-50/60', icon: 'bg-neg-600 text-white', Icon: CircleAlert, label: 'Atenção' },
  warning: { wrap: 'border-warn-600/20 bg-warn-50/70', icon: 'bg-warn-600 text-white', Icon: AlertTriangle, label: 'Alerta' },
  info: { wrap: 'border-brand-600/15 bg-brand-50/60', icon: 'bg-brand-600 text-white', Icon: Lightbulb, label: 'Informativo' },
};

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const t = TONES[insight.tone];
  const content = (
    <div className={`group flex h-full gap-3 rounded-xl border p-3.5 transition ${t.wrap} ${insight.link ? 'hover:shadow-card' : ''}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
        <t.Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
          {insight.title}
          {!compact && <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">{t.label}</span>}
        </p>
        <p className={`mt-0.5 text-[13px] leading-relaxed text-slate-600 ${compact ? 'line-clamp-3' : ''}`}>{insight.message}</p>
        {insight.link && !compact && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
  return insight.link ? (
    <Link to={insight.link} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
