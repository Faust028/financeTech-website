import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, BarChart3, Boxes, CalendarRange, FileSpreadsheet, FileText, Scale } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { qs } from '../lib/api';
import { formatCell, exportExcel, exportPDF } from '../lib/export';
import type { Report } from '../lib/types';
import { PeriodFilter, rangeFor, type Period } from '../components/PeriodFilter';
import { Button } from '../components/ui/Button';
import { useFeedback } from '../components/ui/Feedback';
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge, Table, Td, Th, PageHeader } from '../components/ui/misc';
import { CATEGORY_COLORS, COLORS, ChartTooltip, Legend, axisProps, moneyTick } from '../components/charts';

const TYPES = [
  { id: 'receitas', label: 'Receitas', desc: 'Entradas por categoria', icon: ArrowUpCircle, cat: 'revenue' },
  { id: 'despesas', label: 'Despesas', desc: 'Saídas e contas', icon: ArrowDownCircle, cat: 'expense' },
  { id: 'lucro', label: 'Lucro ou prejuízo', desc: 'Resultado mensal', icon: Scale, cat: 'both' },
  { id: 'fluxo', label: 'Fluxo de caixa', desc: 'Saldos realizados', icon: ArrowLeftRight, cat: null },
  { id: 'estoque', label: 'Estoque', desc: 'Posição e valores', icon: Boxes, cat: 'product' },
  { id: 'comparativo', label: 'Comparativo mensal', desc: 'Mês a mês', icon: CalendarRange, cat: 'both' },
] as const;

type TypeId = (typeof TYPES)[number]['id'];

function ReportChart({ chart }: { chart: NonNullable<Report['chart']> }) {
  if (!chart.data.length) return <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="Sem dados para o gráfico" description="Não há valores no período e filtros selecionados." />;
  if (chart.kind === 'pie') {
    const total = chart.data.reduce((a, d) => a + Number(d.value ?? 0), 0);
    return (
      <div className="grid items-center gap-4 p-5 md:grid-cols-2">
        <div className="h-[240px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2} stroke="none">
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2">
          {chart.data.map((d, i) => (
            <li key={String(d.name)} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
              <span className="flex-1 text-slate-600">{String(d.name)}</span>
              <span className="text-xs text-muted">{((Number(d.value) / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
              <span className="num w-28 text-right font-semibold">{formatCell(d.value, 'money')}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="h-[300px] px-2 pt-4 pb-3">
      <ResponsiveContainer>
        {chart.kind === 'composed' ? (
          <ComposedChart data={chart.data} margin={{ left: 4, right: 12 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey={chart.xKey} {...axisProps} minTickGap={12} />
            <YAxis yAxisId="l" {...axisProps} tickFormatter={moneyTick} width={72} />
            {chart.series[2]?.key === 'saldoFinal' && <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={moneyTick} width={72} />}
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
            {chart.series.slice(0, 2).map((s) => (
              <Bar yAxisId="l" key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[5, 5, 0, 0]} maxBarSize={28} />
            ))}
            {chart.series.slice(2).map((s) => (
              <Line yAxisId={chart.series[2]?.key === 'saldoFinal' ? 'r' : 'l'} key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </ComposedChart>
        ) : (
          <BarChart data={chart.data} margin={{ left: 4, right: 12 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis dataKey={chart.xKey} {...axisProps} interval={0} tick={{ fontSize: 11, fill: COLORS.axis }} />
            <YAxis {...axisProps} tickFormatter={moneyTick} width={72} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
            {chart.series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={40} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function ReportsPage() {
  const { settings, version } = useSettings();
  const { toast } = useFeedback();
  const [type, setType] = useState<TypeId>('lucro');
  const [period, setPeriod] = useState<Period>(() => rangeFor('6m'));
  const [category, setCategory] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const { data, loading, error, reload } = useApi<Report>(`/reports/${type}${qs({ from: period.from, to: period.to, category, v: version })}`);

  const meta = TYPES.find((t) => t.id === type)!;
  const categories =
    meta.cat === 'revenue'
      ? settings?.revenueCategories
      : meta.cat === 'expense'
        ? settings?.expenseCategories
        : meta.cat === 'product'
          ? settings?.productCategories
          : meta.cat === 'both'
            ? [...(settings?.revenueCategories ?? []), ...(settings?.expenseCategories ?? [])]
            : undefined;

  async function doExport(kind: 'pdf' | 'xlsx') {
    if (!data) return;
    setExporting(kind);
    try {
      if (kind === 'pdf') await exportPDF(data, settings?.companyName ?? '');
      else await exportExcel(data, settings?.companyName ?? '');
      toast('success', 'Relatório exportado', `Arquivo ${kind === 'pdf' ? 'PDF' : 'Excel'} gerado com sucesso.`);
    } catch (e) {
      console.error(e);
      toast('error', 'Falha ao exportar', 'Tente novamente.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Relatórios"
        description="Gere relatórios consolidados com gráficos, tabelas e totais. Exporte em PDF ou Excel para compartilhar com seu contador ou sócios."
        actions={
          <>
            <Button variant="secondary" icon={<FileText className="h-4 w-4 text-neg-600" />} onClick={() => doExport('pdf')} loading={exporting === 'pdf'} disabled={!data || loading}>
              Exportar PDF
            </Button>
            <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4 text-pos-600" />} onClick={() => doExport('xlsx')} loading={exporting === 'xlsx'} disabled={!data || loading}>
              Exportar Excel
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setType(t.id);
              setCategory('');
            }}
            className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition ${
              type === t.id ? 'border-brand-600 bg-brand-50/70 ring-4 ring-brand-100' : 'border-line bg-white hover:border-brand-200 hover:shadow-card'
            }`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${type === t.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <t.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[13px] font-bold text-ink">{t.label}</span>
              <span className="block text-[11px] text-muted">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {type !== 'estoque' ? (
          <PeriodFilter value={period} onChange={setPeriod} presets={['month', 'lastMonth', '30d', '6m', 'year', 'custom']} />
        ) : (
          <p className="text-sm text-muted">O relatório de estoque mostra a posição atual dos produtos.</p>
        )}
        {categories && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field w-full lg:w-64" aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {Array.from(new Set(categories)).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-[340px] rounded-2xl" />
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div>
            <h2 className="text-lg font-extrabold text-ink">{data.title}</h2>
            <p className="text-xs text-muted">{data.subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {data.summary.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs font-semibold text-muted">{s.label}</p>
                <p className={`num mt-1 text-xl font-extrabold ${s.tone === 'positive' ? 'text-pos-700' : s.tone === 'negative' ? 'text-neg-600' : 'text-ink'}`}>{formatCell(s.value, s.format)}</p>
              </div>
            ))}
          </div>

          {data.chart && (
            <Card title="Visualização" action={data.chart.kind !== 'pie' ? <Legend items={data.chart.series.map((s) => ({ label: s.label, color: s.color }))} /> : undefined}>
              <ReportChart chart={data.chart} />
            </Card>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-bold text-ink">Detalhamento</h3>
              <p className="text-xs text-muted">{data.rows.length} linha(s)</p>
            </div>
            {data.rows.length === 0 ? (
              <EmptyState icon={<FileText className="h-6 w-6" />} title="Nenhum registro" description="Não há dados para o período e filtros selecionados." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <Th key={c.key} right={c.align === 'right'}>
                        {c.label}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      {data.columns.map((c) => {
                        const v = r[c.key];
                        const isNeg = (c.format === 'money' || c.format === 'percent') && typeof v === 'number' && v < 0;
                        return (
                          <Td key={c.key} right={c.align === 'right'} className={`${c.format === 'money' || c.format === 'number' || c.format === 'percent' || c.format === 'date' ? 'num whitespace-nowrap' : ''} ${isNeg ? 'text-neg-600' : 'text-slate-700'}`}>
                            {c.format === 'status' ? <StatusBadge status={String(v)} /> : formatCell(v, c.format)}
                          </Td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {data.totals && (
                  <tfoot>
                    <tr className="bg-slate-50/80">
                      {data.columns.map((c, i) => (
                        <Td key={c.key} right={c.align === 'right'} className="num font-extrabold whitespace-nowrap text-ink">
                          {data.totals![c.key] !== undefined ? formatCell(data.totals![c.key], c.format === 'status' ? 'text' : c.format) : i === 0 ? 'Total' : ''}
                        </Td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
