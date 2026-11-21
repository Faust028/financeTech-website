import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Boxes,
  CalendarClock,
  HandCoins,
  PiggyBank,
  Receipt,
  Scale,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { qs } from '../lib/api';
import { date, money, percent } from '../lib/format';
import type { Dashboard } from '../lib/types';
import { PeriodFilter, rangeFor, type Period } from '../components/PeriodFilter';
import { Card, EmptyState, ErrorState, Skeleton, StatCard, StatusBadge } from '../components/ui/misc';
import { InsightCard } from '../components/InsightCard';
import { CATEGORY_COLORS, COLORS, ChartTooltip, Legend, axisProps, moneyTick } from '../components/charts';

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[340px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>(() => rangeFor('month'));
  const { version } = useSettings();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<Dashboard>(`/dashboard${qs({ from: period.from, to: period.to, v: version })}`);

  const periodLabel = period.from === period.to ? date(period.from) : `${date(period.from)} a ${date(period.to)}`;
  const totalExpCat = data?.expensesByCategory.reduce((a, c) => a + c.value, 0) ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Visão geral do negócio</h1>
          <p className="mt-1 text-sm text-muted">
            Indicadores calculados a partir dos seus lançamentos · <span className="font-semibold text-slate-600">{periodLabel}</span>
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <DashboardSkeleton />
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* KPIs principais */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-5 text-white shadow-pop">
              <div className="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full bg-brand-600/40 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <span className="text-[13px] font-semibold text-blue-100/70">Saldo atual em caixa</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <Wallet className="h-[18px] w-[18px]" />
                </span>
              </div>
              <div className={`num relative mt-3 text-[28px] leading-tight font-extrabold tracking-tight ${data.balance < 0 ? 'text-red-300' : ''}`}>{money(data.balance)}</div>
              <p className="relative mt-2 text-xs text-blue-100/60">
                No início do período: <span className="num font-semibold text-blue-50">{money(data.balanceAtRangeStart)}</span>
              </p>
            </div>
            <StatCard
              label="Receitas recebidas"
              value={money(data.period.received)}
              icon={<ArrowUpCircle className="h-[18px] w-[18px]" />}
              tone="green"
              change={data.period.receivedChange}
              hint={data.period.pendingRevenue > 0 ? <span>+ {money(data.period.pendingRevenue)} pendente</span> : 'vs. período anterior'}
              onClick={() => navigate('/receitas')}
            />
            <StatCard
              label="Despesas pagas"
              value={money(data.period.paid)}
              icon={<ArrowDownCircle className="h-[18px] w-[18px]" />}
              tone="red"
              change={data.period.paidChange}
              invertChange
              hint={data.period.pendingExpense > 0 ? <span>+ {money(data.period.pendingExpense)} a pagar</span> : 'vs. período anterior'}
              onClick={() => navigate('/despesas')}
            />
            <StatCard
              label={data.period.profit >= 0 ? 'Lucro do período' : 'Prejuízo do período'}
              value={money(data.period.profit)}
              valueClass={data.period.profit >= 0 ? 'text-pos-700' : 'text-neg-600'}
              icon={<Scale className="h-[18px] w-[18px]" />}
              tone={data.period.profit >= 0 ? 'blue' : 'red'}
              change={data.period.profitChange}
              hint={data.period.received > 0 ? `Margem de ${percent((data.period.profit / data.period.received) * 100)}` : 'Receitas − despesas realizadas'}
            />
          </div>

          {/* Pendências */}
          <div className="grid gap-4 md:grid-cols-3">
            <button onClick={() => navigate('/despesas?status=PENDENTE')} className="card flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neg-50 text-neg-600">
                <Receipt className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted">Contas a pagar</p>
                <p className="num text-lg font-extrabold text-ink">{money(data.payables.total)}</p>
                <p className="truncate text-xs text-muted">
                  {data.payables.count} em aberto
                  {data.payables.overdueCount > 0 && <span className="font-semibold text-neg-600"> · {data.payables.overdueCount} atrasada(s)</span>}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </button>
            <button onClick={() => navigate('/receitas?status=PENDENTE')} className="card flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pos-50 text-pos-600">
                <HandCoins className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted">Contas a receber</p>
                <p className="num text-lg font-extrabold text-ink">{money(data.receivables.total)}</p>
                <p className="truncate text-xs text-muted">
                  {data.receivables.count} pendente(s)
                  {data.receivables.lateCount > 0 && <span className="font-semibold text-warn-700"> · {data.receivables.lateCount} em atraso</span>}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </button>
            <button onClick={() => navigate('/estoque?filtro=baixo')} className="card flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${data.stock.lowCount ? 'bg-warn-50 text-warn-600' : 'bg-slate-100 text-slate-500'}`}>
                <Boxes className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-muted">Estoque baixo</p>
                <p className="num text-lg font-extrabold text-ink">
                  {data.stock.lowCount} <span className="text-sm font-semibold text-muted">de {data.stock.products} produtos</span>
                </p>
                <p className="truncate text-xs text-muted">Estoque avaliado em {money(data.stock.value)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          {/* Gráficos linha 1 */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Receitas x Despesas"
              subtitle="Valores recebidos e pagos nos últimos 6 meses"
              action={<Legend items={[{ label: 'Receitas', color: COLORS.green }, { label: 'Despesas', color: COLORS.red }]} />}
            >
              <div className="h-[290px] px-2 pt-4 pb-3">
                <ResponsiveContainer>
                  <BarChart data={data.monthly} barGap={4} margin={{ left: 4, right: 12 }}>
                    <CartesianGrid vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={moneyTick} width={70} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="receitas" name="Receitas" fill={COLORS.green} radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="despesas" name="Despesas" fill={COLORS.red} radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Despesas por categoria" subtitle="Valores pagos no período selecionado">
              {data.expensesByCategory.length === 0 ? (
                <EmptyState icon={<PiggyBank className="h-6 w-6" />} title="Nenhuma despesa paga" description="Não há despesas pagas no período selecionado." />
              ) : (
                <div className="px-5 pt-2 pb-5">
                  <div className="relative h-[180px]">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.expensesByCategory} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                          {data.expensesByCategory.map((_, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-semibold text-muted">Total</span>
                      <span className="num text-sm font-extrabold text-ink">{money(totalExpCat)}</span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {data.expensesByCategory.slice(0, 5).map((c, i) => (
                      <li key={c.name} className="flex items-center gap-2 text-[13px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="min-w-0 flex-1 truncate text-slate-600">{c.name}</span>
                        <span className="text-xs text-muted">{percent((c.value / totalExpCat) * 100, 0)}</span>
                        <span className="num w-24 text-right font-semibold text-ink">{money(c.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* Gráficos linha 2 */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Evolução do saldo" subtitle="Saldo em caixa ao final de cada dia">
              <div className="h-[260px] px-2 pt-4 pb-3">
                <ResponsiveContainer>
                  <AreaChart data={data.balanceSeries} margin={{ left: 4, right: 12 }}>
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                    <YAxis {...axisProps} tickFormatter={moneyTick} width={70} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke={COLORS.red} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="saldo" name="Saldo" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#saldoGrad)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title="Desempenho financeiro mensal"
              subtitle="Resultado (lucro/prejuízo) por mês"
              action={<Legend items={[{ label: 'Lucro', color: COLORS.blue }, { label: 'Prejuízo', color: COLORS.red }, { label: 'Saldo', color: COLORS.navy }]} />}
            >
              <div className="h-[260px] px-2 pt-4 pb-3">
                <ResponsiveContainer>
                  <ComposedChart data={data.monthly} margin={{ left: 4, right: 12 }}>
                    <CartesianGrid vertical={false} stroke={COLORS.grid} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis yAxisId="l" {...axisProps} tickFormatter={moneyTick} width={70} />
                    <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={moneyTick} width={70} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                    <ReferenceLine yAxisId="l" y={0} stroke="#CBD5E1" />
                    <Bar yAxisId="l" dataKey="lucro" name="Resultado" radius={[6, 6, 0, 0]} maxBarSize={34}>
                      {data.monthly.map((m) => (
                        <Cell key={m.month} fill={m.lucro >= 0 ? COLORS.blue : COLORS.red} />
                      ))}
                    </Bar>
                    <Line yAxisId="r" type="monotone" dataKey="saldo" name="Saldo fim do mês" stroke={COLORS.navy} strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Insights + listas */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-600" /> FinanceTech Insights
                </span>
              }
              subtitle="Análises automáticas geradas com base nos seus dados"
              action={
                <Link to="/insights" className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              {data.insights.length === 0 ? (
                <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Ainda sem análises" description="Cadastre receitas, despesas e produtos para receber análises automáticas." />
              ) : (
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  {data.insights.map((i) => (
                    <InsightCard key={i.id} insight={i} compact />
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Próximos vencimentos"
              subtitle={`Alerta para contas vencendo em até ${data.payables.dueSoonDays} dias`}
              action={
                <Link to="/despesas" className="text-xs font-semibold text-brand-700 hover:underline">
                  Ver todas
                </Link>
              }
            >
              {data.upcoming.length === 0 ? (
                <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Nada a pagar" description="Nenhuma conta pendente no momento." />
              ) : (
                <ul className="divide-y divide-line px-5 pt-2 pb-3">
                  {data.upcoming.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] leading-none font-bold ${
                          u.status === 'ATRASADO' ? 'bg-neg-50 text-neg-600' : u.daysToDue <= data.payables.dueSoonDays ? 'bg-warn-50 text-warn-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-[13px]">{u.dueDate.slice(8, 10)}</span>
                        {date(u.dueDate).slice(3, 5)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{u.description}</p>
                        <p className="text-xs text-muted">
                          {u.status === 'ATRASADO' ? (
                            <span className="font-semibold text-neg-600">Atrasada há {-u.daysToDue} dia(s)</span>
                          ) : u.daysToDue === 0 ? (
                            <span className="font-semibold text-warn-700">Vence hoje</span>
                          ) : (
                            `Vence em ${u.daysToDue} dia(s)`
                          )}
                        </p>
                      </div>
                      <span className="num text-[13px] font-bold text-ink">{money(u.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Últimas movimentações"
              action={
                <Link to="/fluxo-de-caixa" className="text-xs font-semibold text-brand-700 hover:underline">
                  Fluxo de caixa
                </Link>
              }
            >
              {data.recent.length === 0 ? (
                <EmptyState icon={<Receipt className="h-6 w-6" />} title="Sem lançamentos" description="Suas receitas e despesas aparecerão aqui." />
              ) : (
                <ul className="divide-y divide-line px-5 pt-2 pb-3">
                  {data.recent.map((r) => (
                    <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 py-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.kind === 'RECEITA' ? 'bg-pos-50 text-pos-600' : 'bg-neg-50 text-neg-600'}`}>
                        {r.kind === 'RECEITA' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{r.description}</p>
                        <p className="truncate text-xs text-muted">
                          {date(r.date)} · {r.category}
                          {r.party ? ` · ${r.party}` : ''}
                        </p>
                      </div>
                      <span className="hidden sm:block">
                        <StatusBadge status={r.status} />
                      </span>
                      <span className={`num w-28 text-right text-[13px] font-bold ${r.kind === 'RECEITA' ? 'text-pos-700' : 'text-neg-600'}`}>
                        {r.kind === 'RECEITA' ? '+' : '−'} {money(r.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Produtos com estoque baixo"
              action={
                <Link to="/estoque?filtro=baixo" className="text-xs font-semibold text-brand-700 hover:underline">
                  Ver estoque
                </Link>
              }
            >
              {data.stock.lowItems.length === 0 ? (
                <EmptyState icon={<Boxes className="h-6 w-6" />} title="Estoque em dia" description="Nenhum produto abaixo do estoque mínimo." />
              ) : (
                <ul className="space-y-3 px-5 pt-3 pb-5">
                  {data.stock.lowItems.map((p) => {
                    const pct = p.minStock > 0 ? Math.max(0, Math.min(100, (p.quantity / p.minStock) * 100)) : 0;
                    return (
                      <li key={p.id}>
                        <div className="flex items-center justify-between gap-2 text-[13px]">
                          <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                            {p.quantity <= 0 && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-neg-600" />}
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className="num shrink-0 text-xs font-semibold text-muted">
                            {p.quantity} / mín. {p.minStock}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${p.quantity <= 0 ? 'bg-neg-600' : 'bg-warn-600'}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
