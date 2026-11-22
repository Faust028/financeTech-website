#!/usr/bin/env node
/**
 * Copia o build do front-end (client/dist) para outra pasta.
 * Usado quando o Root Directory da Vercel é "server": a Vercel publica
 * server/public como site estático.
 *
 *   node scripts/copy-dist.mjs server/public
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];
if (!target) {
  console.error('Uso: node scripts/copy-dist.mjs <pasta-destino>');
  process.exit(1);
}

const from = path.join(root, 'client', 'dist');
const to = path.resolve(root, target);
if (!fs.existsSync(path.join(from, 'index.html'))) {
  console.error(`✖ Build do front-end não encontrado em ${from}. Rode "npm run build -w client" antes.`);
  process.exit(1);
}

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`✔ Front-end copiado: client/dist → ${path.relative(root, to)}`);
