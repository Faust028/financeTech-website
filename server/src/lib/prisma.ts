import { PrismaClient } from '@prisma/client';

// Em funções serverless o módulo pode ser reutilizado entre invocações:
// mantemos uma única instância para não abrir conexões em excesso.
// DIRECT_URL (usada só por migrações) recebe DATABASE_URL quando ausente.
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;

/** true quando o banco em uso é PostgreSQL (produção). */
export const isPostgres = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? '');

/**
 * Filtro de texto "contém" sem diferenciar maiúsculas/minúsculas.
 * SQLite já compara assim; no PostgreSQL é preciso `mode: 'insensitive'`.
 */
export function containsText(value: string) {
  return (isPostgres ? { contains: value, mode: 'insensitive' } : { contains: value }) as { contains: string };
}
