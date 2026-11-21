import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ah } from '../lib/errors.js';
import { isDateStr, toDate, todayStr } from '../lib/dates.js';
import { expenseSchema, revenueSchema } from '../lib/validation.js';
import { serializeExpense, serializeRevenue } from '../lib/serialize.js';
import { getSettings } from '../services/settings.js';
import { idParam } from './parties.js';

async function ensureParty(kind: 'client' | 'supplier', id: number | null) {
  if (id === null) return;
  const found = kind === 'client' ? await prisma.client.findUnique({ where: { id } }) : await prisma.supplier.findUnique({ where: { id } });
  if (!found)
    throw new AppError(400, `${kind === 'client' ? 'Cliente' : 'Fornecedor'} não encontrado.`, 'VALIDATION', undefined);
}

/* ------------------------------- Receitas ------------------------------- */
export const revenuesRouter = Router();

revenuesRouter.get(
  '/',
  ah(async (req, res) => {
    const { search, from, to, category, status, clientId } = req.query as Record<string, string | undefined>;
    const where: Prisma.RevenueWhereInput = {};
    if (search?.trim()) where.description = { contains: search.trim() };
    if (category) where.category = category;
    if (status === 'RECEBIDO' || status === 'PENDENTE') where.status = status;
    if (clientId) where.clientId = Number(clientId);
    if (isDateStr(from) || isDateStr(to))
      where.date = { ...(isDateStr(from) ? { gte: toDate(from) } : {}), ...(isDateStr(to) ? { lte: toDate(to) } : {}) };
    const rows = await prisma.revenue.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
    let list = rows.map(serializeRevenue);
    if (status === 'ATRASADO') list = list.filter((r) => r.overdue);
    res.json(list);
  }),
);

revenuesRouter.post(
  '/',
  ah(async (req, res) => {
    const data = revenueSchema.parse(req.body);
    await ensureParty('client', data.clientId);
    const r = await prisma.revenue.create({ data: { ...data, date: toDate(data.date) }, include: { client: true } });
    res.status(201).json(serializeRevenue(r));
  }),
);

revenuesRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    const data = revenueSchema.parse(req.body);
    await ensureParty('client', data.clientId);
    const r = await prisma.revenue.update({ where: { id }, data: { ...data, date: toDate(data.date) }, include: { client: true } });
    res.json(serializeRevenue(r));
  }),
);

revenuesRouter.patch(
  '/:id/receive',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    const date = isDateStr(req.body?.date) ? req.body.date : todayStr();
    const r = await prisma.revenue.update({ where: { id }, data: { status: 'RECEBIDO', date: toDate(date) }, include: { client: true } });
    res.json(serializeRevenue(r));
  }),
);

revenuesRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.revenue.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

/* ------------------------------- Despesas ------------------------------- */
export const expensesRouter = Router();

expensesRouter.get(
  '/',
  ah(async (req, res) => {
    const { search, from, to, category, status, supplierId } = req.query as Record<string, string | undefined>;
    const settings = await getSettings();
    const where: Prisma.ExpenseWhereInput = {};
    const today = toDate(todayStr());
    if (search?.trim()) where.description = { contains: search.trim() };
    if (category) where.category = category;
    if (supplierId) where.supplierId = Number(supplierId);
    const dueFilter: Prisma.DateTimeFilter = {};
    if (isDateStr(from)) dueFilter.gte = toDate(from);
    if (isDateStr(to)) dueFilter.lte = toDate(to);
    if (status === 'PAGO') where.status = 'PAGO';
    if (status === 'PENDENTE') {
      where.status = 'PENDENTE';
      dueFilter.gte = dueFilter.gte && dueFilter.gte > today ? dueFilter.gte : today;
    }
    if (status === 'ATRASADO') {
      where.status = 'PENDENTE';
      dueFilter.lt = today;
    }
    if (Object.keys(dueFilter).length) where.dueDate = dueFilter;
    const rows = await prisma.expense.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
    });
    res.json(rows.map((e) => serializeExpense(e, settings.dueSoonDays)));
  }),
);

expensesRouter.post(
  '/',
  ah(async (req, res) => {
    const data = expenseSchema.parse(req.body);
    await ensureParty('supplier', data.supplierId);
    const settings = await getSettings();
    const e = await prisma.expense.create({
      data: { ...data, dueDate: toDate(data.dueDate), paymentDate: data.paymentDate ? toDate(data.paymentDate) : null },
      include: { supplier: true },
    });
    res.status(201).json(serializeExpense(e, settings.dueSoonDays));
  }),
);

expensesRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    const data = expenseSchema.parse(req.body);
    await ensureParty('supplier', data.supplierId);
    const settings = await getSettings();
    const e = await prisma.expense.update({
      where: { id },
      data: { ...data, dueDate: toDate(data.dueDate), paymentDate: data.paymentDate ? toDate(data.paymentDate) : null },
      include: { supplier: true },
    });
    res.json(serializeExpense(e, settings.dueSoonDays));
  }),
);

expensesRouter.patch(
  '/:id/pay',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    const date = isDateStr(req.body?.date) ? req.body.date : todayStr();
    const settings = await getSettings();
    const e = await prisma.expense.update({ where: { id }, data: { status: 'PAGO', paymentDate: toDate(date) }, include: { supplier: true } });
    res.json(serializeExpense(e, settings.dueSoonDays));
  }),
);

expensesRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.expense.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);
