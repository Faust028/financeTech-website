#!/usr/bin/env node
/**
 * Executa o Prisma CLI escolhendo o banco automaticamente.
 *
 *   node scripts/prisma.mjs <comando do prisma...>
 *   ex.: node scripts/prisma.mjs generate
 *        node scripts/prisma.mjs migrate deploy
 *
 * - DATABASE_URL "postgresql://..." (produção/Vercel) → usa prisma/schema.prisma (PostgreSQL).
 * - DATABASE_URL "file:..." ou ausente (desenvolvimento local) → gera prisma/schema.sqlite.prisma
 *   a partir do schema principal e usa SQLite, sem precisar instalar PostgreSQL.
 * - Na Vercel (variável VERCEL definida) sempre usa PostgreSQL.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// carrega server/.env sem sobrescrever variáveis já definidas
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile });

const DEFAULT_SQLITE_URL = 'file:./financetech.db';
const onVercel = !!process.env.VERCEL;
const url = process.env.DATABASE_URL || (onVercel ? '' : DEFAULT_SQLITE_URL);
const usePostgres = onVercel || /^postgres(ql)?:\/\//i.test(url);

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Uso: node scripts/prisma.mjs <comando do prisma>');
  process.exit(1);
}

const mainSchema = path.join(root, 'prisma', 'schema.prisma');
let schema = mainSchema;
const env = { ...process.env };

if (usePostgres) {
  const needsDb = !['generate', 'validate', 'format'].includes(args[0]);
  if (!url && needsDb) {
    console.error('\n✖ DATABASE_URL não definida. Cadastre a URL do PostgreSQL nas variáveis de ambiente.\n');
    process.exit(1);
  }
  env.DATABASE_URL = url || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
  env.DIRECT_URL = process.env.DIRECT_URL || env.DATABASE_URL;
} else {
  // gera a variante SQLite do schema
  const src = fs.readFileSync(mainSchema, 'utf8');
  const sqlite = src
    .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
    .replace(/^\s*directUrl\s*=.*$/m, '');
  schema = path.join(root, 'prisma', 'schema.sqlite.prisma');
  const header = '// ARQUIVO GERADO por scripts/prisma.mjs — não edite. Fonte: schema.prisma\n';
  if (!fs.existsSync(schema) || fs.readFileSync(schema, 'utf8') !== header + sqlite) fs.writeFileSync(schema, header + sqlite);
  env.DATABASE_URL = url;
}

console.log(`› prisma ${args.join(' ')}  [${usePostgres ? 'PostgreSQL' : 'SQLite local'}]`);
const bin = path.join(path.dirname(require.resolve('prisma/package.json')), 'build', 'index.js');
const res = spawnSync(process.execPath, [bin, ...args, '--schema', schema], { stdio: 'inherit', env, cwd: root });
process.exit(res.status ?? 1);
