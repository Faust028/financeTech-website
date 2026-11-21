import { prisma } from '../lib/prisma.js';
import { addDays, addMonths, monthEnd, monthLongLabel, monthStart } from '../lib/dates.js';
import { balanceAt, groupSum, inRange, paidIn, receivedIn, round2, sum, type Ledger } from './ledger.js';

export type InsightTone = 'positive' | 'negative' | 'warning' | 'info';
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  message: string;
  link?: string;
  priority: number; // maior = mais relevante
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * Gera análises automáticas exclusivamente a partir dos dados cadastrados.
 * Cada regra só produz um insight quando há dados suficientes para sustentá-la.
 */
export async function buildInsights(L: Ledger): Promise<Insight[]> {
  const out: Insight[] = [];
  const { today, settings } = L;
  const curStart = monthStart(today);
  const dayOfMonth = Number(today.slice(8, 10));
  const prevStart = addMonths(curStart, -1);
  // mesmo intervalo de dias do mês anterior (comparação justa)
  const prevSameDay = addDays(prevStart, Math.min(dayOfMonth, Number(monthEnd(prevStart).slice(8, 10))) - 1);

  // 1. Despesas: mês atual até hoje x mesmo período do mês anterior
  const expCur = paidIn(L, curStart, today);
  const expPrev = paidIn(L, prevStart, prevSameDay);
  if (expPrev > 0 && expCur > 0) {
    const ch = ((expCur - expPrev) / expPrev) * 100;
    if (Math.abs(ch) >= 5) {
      out.push({
        id: 'expenses-trend',
        tone: ch > 0 ? 'warning' : 'positive',
        title: ch > 0 ? 'Despesas em alta' : 'Despesas em queda',
        message: `Suas despesas pagas ${ch > 0 ? 'aumentaram' : 'diminuíram'} ${pct(ch)} em comparação ao mesmo período do mês anterior (${brl(expCur)} contra ${brl(expPrev)}).`,
        link: '/despesas',
        priority: ch > 0 ? 70 : 50,
      });
    }
  }

  // 2. Receitas: mesma comparação
  const revCur = receivedIn(L, curStart, today);
  const revPrev = receivedIn(L, prevStart, prevSameDay);
  if (revPrev > 0 && revCur > 0) {
    const ch = ((revCur - revPrev) / revPrev) * 100;
    if (Math.abs(ch) >= 5) {
      out.push({
        id: 'revenue-trend',
        tone: ch > 0 ? 'positive' : 'warning',
        title: ch > 0 ? 'Receitas crescendo' : 'Receitas em queda',
        message: `Suas receitas recebidas ${ch > 0 ? 'cresceram' : 'caíram'} ${pct(ch)} em relação ao mesmo período do mês anterior (${brl(revCur)} contra ${brl(revPrev)}).`,
        link: '/receitas',
        priority: ch > 0 ? 55 : 68,
      });
    }
  }

  // 3. Maior categoria de gasto no mês (competência: vencimento no mês)
  const monthExpenses = L.expenses.filter((e) => inRange(e.dueDate, curStart, monthEnd(today)));
  const byCat = groupSum(monthExpenses, (e) => e.category, (e) => e.amount);
  const totalMonthExp = sum(monthExpenses, (e) => e.amount);
  if (byCat.length > 0 && totalMonthExp > 0) {
    const top = byCat[0];
    out.push({
      id: 'top-category',
      tone: 'info',
      title: 'Maior categoria de gastos',
      message: `A categoria com maior volume de gastos neste mês foi ${top.name}: ${brl(top.value)} (${pct((top.value / totalMonthExp) * 100)} das despesas do mês).`,
      link: '/relatorios',
      priority: 45,
    });
  }

  // 4. Tendência do saldo: fechamento dos 3 últimos meses até hoje
  const points = [3, 2, 1].map((k) => balanceAt(L, monthEnd(addMonths(curStart, -k))));
  const hasHistory = L.events.some((e) => e.date <= monthEnd(addMonths(curStart, -3)));
  if (hasHistory) {
    const nowBal = balanceAt(L, today);
    const series = [...points, nowBal];
    const up = series.every((v, i) => i === 0 || v > series[i - 1]);
    const down = series.every((v, i) => i === 0 || v < series[i - 1]);
    if (up || down) {
      const ch = points[0] !== 0 ? ((nowBal - points[0]) / Math.abs(points[0])) * 100 : null;
      out.push({
        id: 'balance-trend',
        tone: up ? 'positive' : 'negative',
        title: up ? 'Saldo em crescimento' : 'Saldo em queda',
        message: `Seu saldo financeiro apresentou ${up ? 'crescimento' : 'queda'} contínua nos últimos três meses${ch !== null ? ` (${up ? '+' : '-'}${pct(ch)})` : ''}, passando de ${brl(points[0])} para ${brl(nowBal)}.`,
        link: '/fluxo-de-caixa',
        priority: up ? 60 : 85,
      });
    }
  }

  // 5. Contas atrasadas
  const overdue = L.expenses.filter((e) => e.status === 'ATRASADO');
  if (overdue.length) {
    out.push({
      id: 'overdue',
      tone: 'negative',
      title: 'Contas atrasadas',
      message: `${plural(overdue.length, 'conta está atrasada', 'contas estão atrasadas')}, somando ${brl(sum(overdue, (e) => e.amount))}. Regularize para evitar juros e multas.`,
      link: '/despesas?status=ATRASADO',
      priority: 100,
    });
  }

  // 6. Contas próximas do vencimento
  const soonLimit = addDays(today, settings.dueSoonDays);
  const dueSoon = L.expenses.filter((e) => e.status === 'PENDENTE' && inRange(e.dueDate, today, soonLimit));
  if (dueSoon.length) {
    out.push({
      id: 'due-soon',
      tone: 'warning',
      title: 'Vencimentos próximos',
      message: `Existem ${plural(dueSoon.length, 'conta', 'contas')} vencendo nos próximos ${settings.dueSoonDays} dias, totalizando ${brl(sum(dueSoon, (e) => e.amount))}.`,
      link: '/despesas?status=PENDENTE',
      priority: 90,
    });
  }

  // 7. Estoque baixo
  const products = await prisma.product.findMany({ select: { name: true, quantity: true, minStock: true, costPrice: true, salePrice: true } });
  const low = products.filter((p) => p.quantity <= p.minStock);
  if (low.length) {
    const zero = low.filter((p) => p.quantity <= 0).length;
    out.push({
      id: 'low-stock',
      tone: 'warning',
      title: 'Estoque abaixo do mínimo',
      message: `${plural(low.length, 'produto está', 'produtos estão')} com estoque abaixo do mínimo${zero ? ` (${zero} sem nenhuma unidade)` : ''}: ${low
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}${low.length > 3 ? ' e outros' : ''}.`,
      link: '/estoque?filtro=baixo',
      priority: 80,
    });
  }

  // 8. Recebimentos atrasados
  const lateRev = L.revenues.filter((r) => r.status === 'PENDENTE' && r.date < today);
  if (lateRev.length) {
    out.push({
      id: 'late-receivables',
      tone: 'warning',
      title: 'Recebimentos em atraso',
      message: `${plural(lateRev.length, 'recebimento previsto não foi registrado', 'recebimentos previstos não foram registrados')} até a data esperada (${brl(sum(lateRev, (r) => r.amount))}). Vale cobrar os clientes.`,
      link: '/receitas?status=PENDENTE',
      priority: 75,
    });
  }

  // 9. Margem do mês
  const monthProfit = round2(revCur - expCur);
  if (revCur > 0) {
    const margin = (monthProfit / revCur) * 100;
    out.push({
      id: 'margin',
      tone: monthProfit >= 0 ? 'positive' : 'negative',
      title: monthProfit >= 0 ? 'Mês no azul' : 'Mês no vermelho',
      message:
        monthProfit >= 0
          ? `Em ${monthLongLabel(today)} o negócio teve lucro de ${brl(monthProfit)} até agora, com margem de ${pct(margin)} sobre as receitas.`
          : `Em ${monthLongLabel(today)} as saídas superam as entradas em ${brl(-monthProfit)} até agora. Revise despesas não essenciais.`,
      link: '/relatorios',
      priority: monthProfit >= 0 ? 40 : 88,
    });
  }

  // 10. Projeção de saldo para os próximos 30 dias
  const horizon = addDays(today, 30);
  const toReceive = sum(
    L.revenues.filter((r) => r.status === 'PENDENTE' && r.date <= horizon),
    (r) => r.amount,
  );
  const toPay = sum(
    L.expenses.filter((e) => e.status !== 'PAGO' && e.dueDate <= horizon),
    (e) => e.amount,
  );
  if (toReceive > 0 || toPay > 0) {
    const projected = round2(balanceAt(L, today) + toReceive - toPay);
    out.push({
      id: 'projection',
      tone: projected < 0 ? 'negative' : 'info',
      title: 'Projeção para 30 dias',
      message: `Considerando ${brl(toReceive)} a receber e ${brl(toPay)} a pagar até ${horizon.slice(8, 10)}/${horizon.slice(5, 7)}, o saldo projetado é de ${brl(projected)}.${projected < 0 ? ' Atenção: risco de caixa negativo.' : ''}`,
      link: '/fluxo-de-caixa',
      priority: projected < 0 ? 95 : 35,
    });
  }

  // 11. Principal cliente (últimos 90 dias)
  const recentRev = L.revenues.filter((r) => r.clientName && r.status === 'RECEBIDO' && inRange(r.date, addDays(today, -90), today));
  const byClient = groupSum(recentRev, (r) => r.clientName!, (r) => r.amount);
  const totalRecent = receivedIn(L, addDays(today, -90), today);
  if (byClient.length && totalRecent > 0) {
    const top = byClient[0];
    const share = (top.value / totalRecent) * 100;
    out.push({
      id: 'top-client',
      tone: share >= 40 ? 'warning' : 'info',
      title: 'Principal cliente',
      message: `${top.name} gerou ${brl(top.value)} nos últimos 90 dias (${pct(share)} das receitas).${share >= 40 ? ' Alta dependência de um único cliente.' : ''}`,
      link: '/clientes',
      priority: share >= 40 ? 58 : 30,
    });
  }

  // 12. Valor parado em estoque
  if (products.length) {
    const cost = round2(products.reduce((a, p) => a + Math.max(p.quantity, 0) * p.costPrice, 0));
    const sale = round2(products.reduce((a, p) => a + Math.max(p.quantity, 0) * p.salePrice, 0));
    if (cost > 0) {
      out.push({
        id: 'stock-value',
        tone: 'info',
        title: 'Capital em estoque',
        message: `Você tem ${brl(cost)} investidos em estoque (preço de custo). Vendido pelo preço atual, renderia ${brl(sale)}, uma margem potencial de ${brl(sale - cost)}.`,
        link: '/estoque',
        priority: 25,
      });
    }
  }

  return out.sort((a, b) => b.priority - a.priority);
}
