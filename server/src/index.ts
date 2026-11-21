import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './lib/errors.js';
import { clientsRouter, suppliersRouter } from './routes/parties.js';
import { expensesRouter, revenuesRouter } from './routes/transactions.js';
import { movementsRouter, productsRouter } from './routes/products.js';
import { analyticsRouter, settingsRouter } from './routes/analytics.js';
import { seedDemo } from './services/demo.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'FinanceTech API' }));
app.use('/api/clients', clientsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/revenues', revenuesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/products', productsRouter);
app.use('/api/stock-movements', movementsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', analyticsRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.', code: 'NOT_FOUND' }));

// Em produção, serve o front-end compilado
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

const PORT = Number(process.env.API_PORT) || 3333;

async function bootstrap() {
  // Primeira execução: popula com dados demonstrativos
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    console.log('Banco vazio — carregando dados demonstrativos (fictícios)...');
    await seedDemo();
  }
  app.listen(PORT, () => console.log(`FinanceTech API rodando em http://localhost:${PORT}`));
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
