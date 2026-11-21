import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Registro') => new AppError(404, `${what} não encontrado.`, 'NOT_FOUND');

/** Envolve handlers assíncronos para que erros cheguem ao middleware. */
export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return res.status(400).json({ error: 'Verifique os campos destacados.', code: 'VALIDATION', fields });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = String(err.meta?.target ?? '');
      const fields: Record<string, string> = {};
      if (target.includes('sku')) fields.sku = 'Já existe um produto com este código/SKU.';
      return res.status(409).json({ error: 'Registro duplicado.', code: 'DUPLICATE', fields });
    }
    if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.', code: 'NOT_FOUND' });
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    return res.status(400).json({ error: 'Requisição inválida.', code: 'BAD_JSON' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.', code: 'INTERNAL' });
}
