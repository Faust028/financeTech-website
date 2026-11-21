export interface Party {
  id: number;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  linkedCount?: number;
}

export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Cartão de crédito' | 'Cartão de débito' | 'Boleto' | 'Transferência' | 'Outro';
export const PAYMENT_METHODS: PaymentMethod[] = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'Outro'];

export interface Revenue {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  clientId: number | null;
  client: { id: number; name: string } | null;
  paymentMethod: PaymentMethod;
  status: 'RECEBIDO' | 'PENDENTE';
  notes: string | null;
  overdue: boolean;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  dueDate: string;
  paymentDate: string | null;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  paymentMethod: PaymentMethod;
  status: 'PAGO' | 'PENDENTE' | 'ATRASADO';
  storedStatus: 'PAGO' | 'PENDENTE';
  notes: string | null;
  daysToDue: number;
  dueSoon: boolean;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  quantity: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  createdAt: string;
  lowStock: boolean;
  stockValue: number;
}

export interface StockMovement {
  id: number;
  productId: number;
  product: { id: number; name: string; sku: string } | null;
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  unitValue: number | null;
  balanceAfter: number;
  date: string;
  notes: string | null;
  revenueId: number | null;
  expenseId: number | null;
}

export interface Settings {
  companyName: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  openingBalance: number;
  openingDate: string;
  dueSoonDays: number;
  revenueCategories: string[];
  expenseCategories: string[];
  productCategories: string[];
  isDemo: boolean;
}

export interface Insight {
  id: string;
  tone: 'positive' | 'negative' | 'warning' | 'info';
  title: string;
  message: string;
  link?: string;
  priority: number;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  receitas: number;
  despesas: number;
  lucro: number;
  margem: number | null;
  saldo: number;
}

export interface Dashboard {
  range: { from: string; to: string; previousFrom: string; previousTo: string };
  company: string;
  isDemo: boolean;
  balance: number;
  balanceAtRangeStart: number;
  period: {
    received: number;
    paid: number;
    profit: number;
    pendingRevenue: number;
    pendingExpense: number;
    receivedChange: number | null;
    paidChange: number | null;
    profitChange: number | null;
  };
  payables: { total: number; count: number; overdueCount: number; overdueTotal: number; dueSoonCount: number; dueSoonTotal: number; dueSoonDays: number };
  receivables: { total: number; count: number; lateCount: number; lateTotal: number };
  stock: { lowCount: number; products: number; value: number; lowItems: { id: number; name: string; sku: string; quantity: number; minStock: number }[] };
  monthly: MonthlyPoint[];
  balanceSeries: { date: string; label: string; saldo: number }[];
  expensesByCategory: { name: string; value: number }[];
  upcoming: { id: number; description: string; amount: number; dueDate: string; status: Expense['status']; supplier: string | null; daysToDue: number }[];
  recent: { kind: 'RECEITA' | 'DESPESA'; id: number; date: string; description: string; category: string; amount: number; status: string; party: string | null }[];
  insights: Insight[];
}

export interface CashflowPeriod {
  key: string;
  label: string;
  start: string;
  end: string;
  entradas: number;
  saidas: number;
  resultado: number;
  saldoInicial: number;
  saldoFinal: number;
  negative: boolean;
}

export interface Cashflow {
  range: { from: string; to: string };
  granularity: 'day' | 'week' | 'month';
  opening: number;
  totalIn: number;
  totalOut: number;
  closing: number;
  minBalance: number;
  negativeDays: number;
  firstNegativeDate: string | null;
  periods: CashflowPeriod[];
  movements: {
    date: string;
    type: 'ENTRADA' | 'SAIDA';
    amount: number;
    description: string;
    category: string;
    party: string | null;
    refId: number;
    paymentMethod: string;
    balance: number;
  }[];
  forecast: { toReceive: number; toReceiveCount: number; toPay: number; toPayCount: number };
}

export type Fmt = 'text' | 'money' | 'date' | 'number' | 'percent' | 'status';
export interface Report {
  type: string;
  title: string;
  subtitle: string;
  summary: { label: string; value: number; format: Fmt; tone?: 'positive' | 'negative' | 'neutral' }[];
  chart: {
    kind: 'bar' | 'pie' | 'line' | 'composed';
    data: Record<string, unknown>[];
    series: { key: string; label: string; color: string }[];
    xKey: string;
  } | null;
  columns: { key: string; label: string; format?: Fmt; align?: 'right' }[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}
