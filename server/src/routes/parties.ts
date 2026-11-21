import { Router } from 'express';
import { containsText, prisma } from '../lib/prisma.js';
import { ah, notFound } from '../lib/errors.js';
import { partySchema } from '../lib/validation.js';

const idParam = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
};

function searchWhere(search?: string) {
  const s = (search ?? '').trim();
  if (!s) return {};
  const digits = s.replace(/\D/g, '');
  return {
    OR: [
      { name: containsText(s) },
      { email: containsText(s.toLowerCase()) },
      ...(digits.length >= 3 ? [{ document: { contains: digits } }, { phone: { contains: digits } }] : []),
    ],
  };
}

/** Clientes */
export const clientsRouter = Router();
clientsRouter.get(
  '/',
  ah(async (req, res) => {
    const list = await prisma.client.findMany({
      where: searchWhere(req.query.search as string),
      orderBy: { name: 'asc' },
      include: { _count: { select: { revenues: true } } },
    });
    res.json(list.map(({ _count, ...c }) => ({ ...c, linkedCount: _count.revenues })));
  }),
);
clientsRouter.post(
  '/',
  ah(async (req, res) => res.status(201).json(await prisma.client.create({ data: partySchema.parse(req.body) }))),
);
clientsRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    res.json(await prisma.client.update({ where: { id }, data: partySchema.parse(req.body) }));
  }),
);
clientsRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.client.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

/** Fornecedores */
export const suppliersRouter = Router();
suppliersRouter.get(
  '/',
  ah(async (req, res) => {
    const list = await prisma.supplier.findMany({
      where: searchWhere(req.query.search as string),
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true, products: true } } },
    });
    res.json(list.map(({ _count, ...s }) => ({ ...s, linkedCount: _count.expenses + _count.products })));
  }),
);
suppliersRouter.post(
  '/',
  ah(async (req, res) => res.status(201).json(await prisma.supplier.create({ data: partySchema.parse(req.body) }))),
);
suppliersRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    res.json(await prisma.supplier.update({ where: { id }, data: partySchema.parse(req.body) }));
  }),
);
suppliersRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.supplier.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

export { idParam };
