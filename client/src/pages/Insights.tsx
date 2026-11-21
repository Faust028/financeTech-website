import { useMemo } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { qs } from '../lib/api';
import type { Insight } from '../lib/types';
import { InsightCard } from '../components/InsightCard';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/misc';

const GROUPS: { tone: Insight['tone']; title: string; desc: string }[] = [
  { tone: 'negative', title: 'Requer atenção imediata', desc: 'Situações que podem gerar custos ou falta de caixa.' },
  { tone: 'warning', title: 'Alertas', desc: 'Pontos para acompanhar de perto.' },
  { tone: 'positive', title: 'Boas notícias', desc: 'Indicadores evoluindo bem.' },
  { tone: 'info', title: 'Informações úteis', desc: 'Contexto para apoiar suas decisões.' },
];

export default function InsightsPage() {
  const { version } = useSettings();
  const { data, loading, error, reload } = useApi<Insight[]>(`/insights${qs({ v: version })}`);
  const grouped = useMemo(() => GROUPS.map((g) => ({ ...g, items: (data ?? []).filter((i) => i.tone === g.tone) })), [data]);

  return (
    <div>
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="FinanceTech Insights"
        description="Análises automáticas calculadas exclusivamente com os dados cadastrados no sistema: receitas, despesas, contas e estoque. Nada é estimado sem base nos seus lançamentos."
        actions={
          <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={reload} loading={loading}>
            Atualizar análises
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title="Ainda não há dados suficientes"
            description="Cadastre receitas, despesas e produtos. As análises aparecem automaticamente assim que houver informações para comparar."
          />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {grouped.map((g) => (
              <div key={g.tone} className="card p-4">
                <p className="text-xs font-semibold text-muted">{g.title}</p>
                <p className="num mt-1 text-2xl font-extrabold text-ink">{g.items.length}</p>
              </div>
            ))}
          </div>
          {grouped
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.tone}>
                <h2 className="text-[15px] font-bold text-ink">{g.title}</h2>
                <p className="mb-3 text-xs text-muted">{g.desc}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {g.items.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
