/**
 * Servidor local (desenvolvimento e `npm start`).
 * Na Vercel este arquivo NÃO é usado: a API roda como Serverless Function
 * em api/index.ts, que importa o mesmo app de ./app.ts.
 */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { prisma } from './lib/prisma.js';
import { app as api } from './app.js';
import { seedDemo } from './services/demo.js';

const server = express();
server.use(api);

// `npm start`: serve também o front-end compilado
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, '../../client/dist');
if (fs.existsSync(dist)) {
  server.use(express.static(dist));
  server.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = Number(process.env.API_PORT) || 3333;

async function bootstrap() {
  // Ambiente local, primeira execução: popula o banco local com dados demonstrativos.
  // (Em produção isso nunca acontece automaticamente.)
  const isLocalSqlite = (process.env.DATABASE_URL ?? '').startsWith('file:');
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings && isLocalSqlite) {
    console.log('Banco local vazio — carregando dados demonstrativos (fictícios)...');
    await seedDemo();
  }
  server.listen(PORT, () => console.log(`FinanceTech API rodando em http://localhost:${PORT}`));
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
