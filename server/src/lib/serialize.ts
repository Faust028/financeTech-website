import type { Client, Expense, Product, Revenue, Settings, StockMovement, Supplier } from '@prisma/client';
import { todayStr, toStr } from './dates.js';

type Party = Pick<Client, 'id' | 'name'> | null | undefined;

export function serializeRevenue(r: Revenue & { client?: Party }) {
  const today = todayStr();
  const date = toStr(r.date);
  return {
    ...r,
    date,
    client: r.client ? { id: r.client.id, name: r.client.name } : null,
    overdue: r.status === 'PENDENTE' && date < today,
  };
}

/** Status efetivo: PENDENTE com vencimento anterior a hoje vira ATRASADO. */
export function expenseStatus(status: string, dueDate: string, today = todayStr()) {
  if (status === 'PAGO') return 'PAGO';
  return dueDate < today ? 'ATRASADO' : 'PENDENTE';
}

export function serializeExpense(e: Expense & { supplier?: Pick<Supplier, 'id' | 'name'> | null }, dueSoonDays = 7) {
  const today = todayStr();
  const dueDate = toStr(e.dueDate);
  const status = expenseStatus(e.status, dueDate, today);
  const daysToDue = Math.round((new Date(`${dueDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000);
  return {
    ...e,
    dueDate,
    paymentDate: e.paymentDate ? toStr(e.paymentDate) : null,
    supplier: e.supplier ? { id: e.supplier.id, name: e.supplier.name } : null,
    status,
    storedStatus: e.status,
    daysToDue,
    dueSoon: status === 'PENDENTE' && daysToDue >= 0 && daysToDue <= dueSoonDays,
  };
}

export function serializeProduct(p: Product & { supplier?: Pick<Supplier, 'id' | 'name'> | null }) {
  return {
    ...p,
    createdAt: toStr(p.createdAt),
    supplier: p.supplier ? { id: p.supplier.id, name: p.supplier.name } : null,
    lowStock: p.quantity <= p.minStock,
    stockValue: Math.round(Math.max(0, p.quantity) * p.costPrice * 100) / 100,
  };
}

export function serializeMovement(m: StockMovement & { product?: Pick<Product, 'id' | 'name' | 'sku'> | null }) {
  return {
    ...m,
    date: toStr(m.date),
    product: m.product ? { id: m.product.id, name: m.product.name, sku: m.product.sku } : null,
  };
}

export function serializeSettings(s: Settings) {
  return {
    ...s,
    openingDate: toStr(s.openingDate),
    revenueCategories: JSON.parse(s.revenueCategories) as string[],
    expenseCategories: JSON.parse(s.expenseCategories) as string[],
    productCategories: JSON.parse(s.productCategories) as string[],
  };
}
