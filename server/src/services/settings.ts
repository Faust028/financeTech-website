import { prisma } from '../lib/prisma.js';
import { monthStart, toDate, todayStr } from '../lib/dates.js';
import { serializeSettings } from '../lib/serialize.js';

export const DEFAULT_REVENUE_CATEGORIES = ['Vendas no balcão', 'Vendas online', 'Encomendas', 'Serviços', 'Outras receitas'];
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Fornecedores',
  'Aluguel',
  'Salários',
  'Energia e água',
  'Internet e telefone',
  'Marketing',
  'Impostos',
  'Manutenção',
  'Outras despesas',
];
export const DEFAULT_PRODUCT_CATEGORIES = ['Cafés', 'Chás', 'Acessórios', 'Alimentos', 'Embalagens'];

export async function getSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    s = await prisma.settings.create({
      data: {
        id: 1,
        companyName: 'Minha Empresa',
        openingBalance: 0,
        openingDate: toDate(monthStart(todayStr())),
        revenueCategories: JSON.stringify(DEFAULT_REVENUE_CATEGORIES),
        expenseCategories: JSON.stringify(DEFAULT_EXPENSE_CATEGORIES),
        productCategories: JSON.stringify(DEFAULT_PRODUCT_CATEGORIES),
      },
    });
  }
  return serializeSettings(s);
}

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;
