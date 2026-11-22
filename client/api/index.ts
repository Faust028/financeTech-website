/**
 * Serverless Function da Vercel quando o Root Directory do projeto é "client".
 * Mesmo app Express do back-end (idêntico a /api/index.ts da raiz).
 */
import app from '../../server/src/app.js';

export default app;
