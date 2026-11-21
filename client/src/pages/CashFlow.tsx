import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, CalendarClock, Flag, Info, Landmark, ShieldCheck } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { qs } from '../lib/api';
import { date, money } from '../lib/format';
import type { Cashflow } from '../lib/types';
import { PeriodFilter, rangeFor, type Period } from '../components/PeriodFilter';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, Table, Tabs, Td, Th } from '../components/ui/misc';
import { COLORS, ChartTooltip, Legend, axisProps, moneyTick } from '../components/charts';

type Gran = '' | 'day' | 'week' | 'month';

export default function CashFlowPage() {
  const { version } = useSettings();
  const [period, setPeriod] = useState<Period>(() => rangeFor('month'));
  const [gran, setGran] = useState<Gran>('');
  const [view, setView] = useState<'periodos' | 'movimentos'>('periodos');
  const { data, loading, error, reload } = useApi<Cashflow>(`/cashflow${qs({ from: period.from, to: period.to, granularity: gran, v: version })}`);

  const granLabel = { day: 'Diário', week: 'Semanal', month: 'Mensal' };

  return (
    <div>
      <PageHeader
        icon={<ArrowLeftRight className="h-5 w-5" />}
        title="Fluxo de Caixa"
        description="Acompanhe o dinheiro que efetivamente entrou e saiu do caixa. Lançamentos pendentes não alteram o saldo até serem recebidos ou pagos."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodFilter value={period} onChange={setPeriod} presets={['7d', 'month', '30d', 'lastMonth', '6m', 'year', 'custom']} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Agrupar por</span>
          <select value={gran} onChange={(e) => setGran(e.target.value as Gran)} className="field h-9 w-auto" aria-label="Agrupamento">
            <option value="">Automático</option>
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
      </div>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[340px] rounded-2xl" />
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Saldo inicial" value={money(data.opening)} icon={<Landmark className="h-[18px] w-[18px]" />} tone="slate" hint={`Em ${date(data.range.from)}, antes das movimentações`} valueClass={data.opening < 0 ? 'text-neg-600' : ''} />
            <StatCard label="Entradas realizadas" value={money(data.totalIn)} icon={<ArrowUpCircle className="h-[18px] w-[18px]" />} tone="green" hint="Receitas recebidas no período" />
            <StatCard label="Saídas realizadas" value={money(data.totalOut)} icon={<ArrowDownCircle className="h-[18px] w-[18px]" />} tone="red" hint="Despesas pagas no período" />
            <StatCard
              label="Saldo final"
              value={money(data.closing)}
              icon={<Flag className="h-[18px] w-[18px]" />}
              tone={data.closing >= data.opening ? 'blue' : 'amber'}
              valueClass={data.closing < 0 ? 'text-neg-600' : ''}
              hint={
                <span className={data.closing - data.opening >= 0 ? 'font-semibold text-pos-700' : 'font-semibold text-neg-600'}>
                  {data.closing - data.opening >= 0 ? '+' : ''}
                  {money(data.closing - data.opening)} no período
                </span>
              }
            />
          </div>

          {data.negativeDays > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-neg-600/20 bg-neg-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-neg-600" />
              <div>
                <p className="text-sm font-bold text-neg-700">Saldo negativo identificado em {data.negativeDays} dia(s) do período</p>
                <p className="text-xs text-neg-700/80">
                  O caixa ficou negativo pela primeira vez em {date(data.firstNegativeDate)}. Menor saldo: {money(data.minBalance)}. Os períodos afetados estão destacados em vermelho.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-pos-600/15 bg-pos-50/70 p-3.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-pos-600" />
              <p className="text-sm text-pos-700">
                <b>Nenhum dia com saldo negativo</b> no período. Menor saldo registrado: {money(data.minBalance)}.
              </p>
            </div>
          )}

          <Card
            title="Movimentação financeira"
            subtitle={`Entradas, saídas e saldo · visão ${granLabel[data.granularity].toLowerCase()}`}
            action={<Legend items={[{ label: 'Entradas', color: COLORS.green }, { label: 'Saídas', color: COLORS.red }, { label: 'Saldo', color: COLORS.blue }]} />}
          >
            <div className="h-[320px] px-2 pt-4 pb-3">
              <ResponsiveContainer>
                <ComposedChart data={data.periods} margin={{ left: 4, right: 12 }}>
                  <CartesianGrid vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                  <YAxis yAxisId="l" {...axisProps} tickFormatter={moneyTick} width={72} />
                  <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={moneyTick} width={72} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <ReferenceLine yAxisId="r" y={0} stroke={COLORS.red} strokeDasharray="4 4" />
                  <Bar yAxisId="l" dataKey="entradas" name="Entradas" fill={COLORS.green} radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Bar yAxisId="l" dataKey="saidas" name="Saídas" fill={COLORS.red} radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Line yAxisId="r" type="monotone" dataKey="saldoFinal" name="Saldo" stroke={COLORS.blue} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pos-50 text-pos-600">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted">Previsto a receber no período (não incluso no saldo)</p>
                <p className="num text-lg font-extrabold text-ink">{money(data.forecast.toReceive)}</p>
                <p className="text-xs text-muted">{data.forecast.toReceiveCount} receita(s) pendente(s)</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neg-50 text-neg-600">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-muted">Previsto a pagar no período (não incluso no saldo)</p>
                <p className="num text-lg font-extrabold text-ink">{money(data.forecast.toPay)}</p>
                <p className="text-xs text-muted">{data.forecast.toPayCount} despesa(s) em aberto</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                value={view}
                onChange={setView}
                items={[
                  { value: 'periodos', label: 'Saldos por período', count: data.periods.length },
                  { value: 'movimentos', label: 'Histórico de movimentações', count: data.movements.length },
                ]}
              />
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Info className="h-3.5 w-3.5" /> Regime de caixa: datas de recebimento e de pagamento.
              </p>
            </div>
            {view === 'periodos' ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Período</Th>
                    <Th right>Saldo inicial</Th>
                    <Th right>Entradas</Th>
                    <Th right>Saídas</Th>
                    <Th right>Resultado</Th>
                    <Th right>Saldo final</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p) => (
                    <tr key={p.key} className={p.negative ? 'bg-neg-50/60' : 'hover:bg-slate-50/70'}>
                      <Td className="font-semibold whitespace-nowrap text-ink">
                        {data.granularity === 'day' ? date(p.start) : p.label}
                        {p.negative && <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-neg-600" />}
                      </Td>
                      <Td right className="num text-slate-600">
                        {money(p.saldoInicial)}
                      </Td>
                      <Td right className="num text-pos-700">
                        {p.entradas ? money(p.entradas) : '—'}
                      </Td>
                      <Td right className="num text-neg-600">
                        {p.saidas ? money(p.saidas) : '—'}
                      </Td>
                      <Td right className={`num font-semibold ${p.resultado > 0 ? 'text-pos-700' : p.resultado < 0 ? 'text-neg-600' : 'text-slate-400'}`}>
                        {p.resultado ? money(p.resultado) : '—'}
                      </Td>
                      <Td right className={`num font-bold ${p.saldoFinal < 0 ? 'text-neg-600' : 'text-ink'}`}>
                        {money(p.saldoFinal)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/70">
                    <Td className="font-bold text-ink">Total do período</Td>
                    <Td right className="num font-semibold">
                      {money(data.opening)}
                    </Td>
                    <Td right className="num font-bold text-pos-700">
                      {money(data.totalIn)}
                    </Td>
                    <Td right className="num font-bold text-neg-600">
                      {money(data.totalOut)}
                    </Td>
                    <Td right className="num font-bold">
                      {money(data.totalIn - data.totalOut)}
                    </Td>
                    <Td right className="num font-extrabold">
                      {money(data.closing)}
                    </Td>
                  </tr>
                </tfoot>
              </Table>
            ) : data.movements.length === 0 ? (
              <EmptyState icon={<ArrowLeftRight className="h-6 w-6" />} title="Sem movimentações no período" description="Receitas recebidas e despesas pagas aparecerão aqui." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Data</Th>
                    <Th>Descrição</Th>
                    <Th>Categoria</Th>
                    <Th>Cliente/Fornecedor</Th>
                    <Th right>Valor</Th>
                    <Th right>Saldo</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.map((m, i) => (
                    <tr key={`${m.type}-${m.refId}-${i}`} className={m.balance < 0 ? 'bg-neg-50/50' : 'hover:bg-slate-50/70'}>
                      <Td className="num whitespace-nowrap text-slate-600">{date(m.date)}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {m.type === 'ENTRADA' ? <ArrowUpCircle className="h-4 w-4 shrink-0 text-pos-600" /> : <ArrowDownCircle className="h-4 w-4 shrink-0 text-neg-600" />}
                          <span className="max-w-[260px] truncate font-semibold text-ink">{m.description}</span>
                        </div>
                      </Td>
                      <Td className="text-slate-600">{m.category}</Td>
                      <Td className="text-slate-600">{m.party ?? <span className="text-slate-300">—</span>}</Td>
                      <Td right className={`num font-bold whitespace-nowrap ${m.amount >= 0 ? 'text-pos-700' : 'text-neg-600'}`}>
                        {m.amount >= 0 ? '+' : '−'} {money(Math.abs(m.amount))}
                      </Td>
                      <Td right className={`num font-semibold whitespace-nowrap ${m.balance < 0 ? 'text-neg-600' : 'text-ink'}`}>
                        {money(m.balance)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
