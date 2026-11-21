/**
 * Vercel Serverless Function — ponto de entrada da API em produção.
 *
 * Todas as requisições /api/* são reescritas para esta função (ver vercel.json)
 * e tratadas pelo mesmo app Express usado localmente, preservando rotas,
 * métodos HTTP e respostas. Não há app.listen(): a Vercel invoca o handler.
 */
import app from '../server/src/app.js';

export default app;
