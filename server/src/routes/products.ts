import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { containsText, prisma } from '../lib/prisma.js';
import { AppError, ah, notFound } from '../lib/errors.js';
import { toDate, todayStr } from '../lib/dates.js';
import { movementSchema, productSchema } from '../lib/validation.js';
import { serializeMovement, serializeProduct } from '../lib/serialize.js';
import { getSettings } from '../services/settings.js';
import { idParam } from './parties.js';

export const productsRouter = Router();

const include = { supplier: { select: { id: true, name: true } } } as const;

productsRouter.get(
  '/',
  ah(async (req, res) => {
    const { search, category, filter, supplierId } = req.query as Record<string, string | undefined>;
    const where: Prisma.ProductWhereInput = {};
    if (search?.trim()) where.OR = [{ name: containsText(search.trim()) }, { sku: containsText(search.trim()) }];
    if (category) where.category = category;
    if (supplierId) where.supplierId = Number(supplierId);
    let list = (await prisma.product.findMany({ where, include, orderBy: { name: 'asc' } })).map(serializeProduct);
    if (filter === 'baixo') list = list.filter((p) => p.lowStock);
    res.json(list);
  }),
);

async function ensureSupplier(id: number | null) {
  if (id !== null && !(await prisma.supplier.findUnique({ where: { id } })))
    throw new AppError(400, 'Fornecedor não encontrado.', 'VALIDATION');
}

productsRouter.post(
  '/',
  ah(async (req, res) => {
    const data = productSchema.parse(req.body);
    await ensureSupplier(data.supplierId);
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({ data, include });
      if (data.quantity > 0) {
        await tx.stockMovement.create({
          data: { productId: p.id, type: 'ENTRADA', quantity: data.quantity, unitValue: data.costPrice, balanceAfter: data.quantity, date: toDate(todayStr()), notes: 'Estoque inicial no cadastro' },
        });
      }
      return p;
    });
    res.status(201).json(serializeProduct(product));
  }),
);

productsRouter.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    // a quantidade só muda por movimentações, preservando o histórico
    const { quantity: _ignored, ...data } = productSchema.parse(req.body);
    await ensureSupplier(data.supplierId);
    const p = await prisma.product.update({ where: { id }, data, include });
    res.json(serializeProduct(p));
  }),
);

productsRouter.delete(
  '/:id',
  ah(async (req, res) => {
    await prisma.product.delete({ where: { id: idParam(req.params.id) } });
    res.status(204).end();
  }),
);

productsRouter.post(
  '/:id/movements',
  ah(async (req, res) => {
    const id = idParam(req.params.id);
    const input = movementSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw notFound('Produto');

    const delta = input.type === 'ENTRADA' ? input.quantity : -input.quantity;
    const resulting = product.quantity + delta;
    if (resulting < 0 && !input.confirmNegative) {
      throw new AppError(409, `A saída deixará o estoque de "${product.name}" negativo (${resulting} un.).`, 'NEGATIVE_STOCK', {
        current: product.quantity,
        requested: input.quantity,
        resulting,
      });
    }

    const unitValue = input.unitValue ?? (input.type === 'ENTRADA' ? product.costPrice : product.salePrice);
    const settings = await getSettings();
    const date = toDate(input.date);

    const result = await prisma.$transaction(async (tx) => {
      let revenueId: number | null = null;
      let expenseId: number | null = null;
      if (input.createFinancial && unitValue > 0) {
        const total = Math.round(unitValue * input.quantity * 100) / 100;
        const realized = input.financialStatus === 'REALIZADO';
        if (input.type === 'SAIDA') {
          const cat = settings.revenueCategories.find((c) => /balc|venda/i.test(c)) ?? settings.revenueCategories[0];
          const r = await tx.revenue.create({
            data: {
              description: `Venda: ${input.quantity}x ${product.name}`,
              amount: total,
              category: cat,
              date,
              paymentMethod: input.paymentMethod,
              status: realized ? 'RECEBIDO' : 'PENDENTE',
              notes: 'Gerada automaticamente pela saída de estoque.',
            },
          });
          revenueId = r.id;
        } else {
          const cat = settings.expenseCategories.find((c) => /fornec/i.test(c)) ?? settings.expenseCategories[0];
          const e = await tx.expense.create({
            data: {
              description: `Compra: ${input.quantity}x ${product.name}`,
              amount: total,
              category: cat,
              dueDate: date,
              paymentDate: realized ? date : null,
              supplierId: product.supplierId,
              paymentMethod: input.paymentMethod,
              status: realized ? 'PAGO' : 'PENDENTE',
              notes: 'Gerada automaticamente pela entrada de estoque.',
            },
          });
          expenseId = e.id;
        }
      }
      const updated = await tx.product.update({ where: { id }, data: { quantity: { increment: delta } }, include });
      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          type: input.type,
          quantity: input.quantity,
          unitValue,
          balanceAfter: updated.quantity,
          date,
          notes: input.notes ?? (resulting < 0 ? 'Saída confirmada com estoque negativo.' : null),
          revenueId,
          expenseId,
        },
        include: { product: { select: { id: true, name: true, sku: true } } },
      });
      return { product: serializeProduct(updated), movement: serializeMovement(movement), revenueId, expenseId };
    });
    res.status(201).json(result);
  }),
);

export const movementsRouter = Router();
movementsRouter.get(
  '/',
  ah(async (req, res) => {
    const { productId, type, limit } = req.query as Record<string, string | undefined>;
    const where: Prisma.StockMovementWhereInput = {};
    if (productId) where.productId = Number(productId);
    if (type === 'ENTRADA' || type === 'SAIDA') where.type = type;
    const rows = await prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: Math.min(Number(limit) || 300, 1000),
    });
    res.json(rows.map(serializeMovement));
  }),
);
