import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError, ah } from '../lib/errors.js';
import { toDate } from '../lib/dates.js';
import { rangeQuery, settingsSchema } from '../lib/validation.js';
import { getCashflow, getDashboard, getReport, REPORT_TYPES, type ReportType } from '../services/analytics.js';
import { buildInsights } from '../services/insights.js';
import { loadLedger, normalizeRange } from '../services/ledger.js';
import { getSettings } from '../services/settings.js';
import { clearAllData, seedDemo } from '../services/demo.js';

export const analyticsRouter = Router();

const range = (q: unknown) => {
  const { from, to } = rangeQuery.parse(q);
  return normalizeRange(from, to);
};

analyticsRouter.get(
  '/dashboard',
  ah(async (req, res) => {
    const { from, to } = range(req.query);
    res.json(await getDashboard(from, to));
  }),
);

analyticsRouter.get(
  '/cashflow',
  ah(async (req, res) => {
    const { from, to } = range(req.query);
    const g = req.query.granularity as string | undefined;
    res.json(await getCashflow(from, to, g === 'day' || g === 'week' || g === 'month' ? g : undefined));
  }),
);

analyticsRouter.get(
  '/insights',
  ah(async (_req, res) => {
    const L = await loadLedger();
    res.json(await buildInsights(L));
  }),
);

analyticsRouter.get(
  '/reports/:type',
  ah(async (req, res) => {
    const type = req.params.type as ReportType;
    if (!REPORT_TYPES.includes(type)) throw new AppError(404, 'Relatório não encontrado.', 'NOT_FOUND');
    const { from, to } = range(req.query);
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : undefined;
    res.json(await getReport(type, from, to, category));
  }),
);

/* ----------------------------- Configurações ----------------------------- */
export const settingsRouter = Router();

settingsRouter.get(
  '/',
  ah(async (_req, res) => res.json(await getSettings())),
);

settingsRouter.put(
  '/',
  ah(async (req, res) => {
    await getSettings();
    const d = settingsSchema.parse(req.body);
    await prisma.settings.update({
      where: { id: 1 },
      data: {
        ...d,
        openingDate: toDate(d.openingDate),
        revenueCategories: JSON.stringify(d.revenueCategories),
        expenseCategories: JSON.stringify(d.expenseCategories),
        productCategories: JSON.stringify(d.productCategories),
      },
    });
    res.json(await getSettings());
  }),
);

settingsRouter.post(
  '/demo',
  ah(async (_req, res) => {
    await seedDemo();
    res.json(await getSettings());
  }),
);

settingsRouter.post(
  '/clear',
  ah(async (_req, res) => {
    await clearAllData();
    await getSettings();
    await prisma.settings.update({ where: { id: 1 }, data: { isDemo: false, openingBalance: 0, companyName: 'Minha Empresa', document: null, email: null, phone: null } });
    res.json(await getSettings());
  }),
);
