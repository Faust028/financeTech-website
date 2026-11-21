import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { seedDemo } from '../src/services/demo.js';

seedDemo()
  .then(() => console.log('✔ Dados demonstrativos (fictícios) carregados: Café Aroma & Grão.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
