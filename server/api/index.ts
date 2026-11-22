/**
 * Serverless Function da Vercel quando o Root Directory do projeto é "server".
 * Mesmo app Express de ../src/app.ts (idêntico a /api/index.ts da raiz).
 */
import app from '../src/app.js';

export default app;
