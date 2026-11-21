import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './lib/errors.js';
import { clientsRouter, suppliersRouter } from './routes/parties.js';
import { expensesRouter, revenuesRouter } from './routes/transactions.js';
import { movementsRouter, productsRouter } from './routes/products.js';
import { analyticsRouter, settingsRouter } from './routes/analytics.js';

/**
 * Aplicação Express da API (somente rotas /api).
 * É usada tanto pelo servidor local (src/index.ts) quanto pela
 * Serverless Function da Vercel (api/index.ts na raiz do repositório).
 */
export const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'FinanceTech API' }));
app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: 'conectado' });
  } catch (err) {
    console.error('Falha no banco de dados:', err);
    res.status(503).json({ ok: false, database: 'indisponível', error: 'Não foi possível conectar ao banco de dados.' });
  }
});

app.use('/api/clients', clientsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/revenues', revenuesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/products', productsRouter);
app.use('/api/stock-movements', movementsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', analyticsRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.', code: 'NOT_FOUND' }));

app.use(errorHandler);

export default app;
