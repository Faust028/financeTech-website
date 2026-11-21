import { prisma } from '../lib/prisma.js';
import { addDays, addMonths, monthEnd, monthStart, pad, toDate, todayStr } from '../lib/dates.js';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PRODUCT_CATEGORIES, DEFAULT_REVENUE_CATEGORIES } from './settings.js';

/**
 * DADOS FICTÍCIOS — "Café Aroma & Grão", cafeteria e loja de cafés especiais
 * inventada para demonstração. Nomes, documentos e valores não são reais.
 * Os dados são gerados relativamente à data atual, cobrindo os últimos 6 meses.
 */

// gerador pseudoaleatório determinístico (mesmos dados a cada restauração)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function cpf(base: string) {
  const d = base.split('').map(Number);
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += d[i] * (len + 1 - i);
    const r = (sum * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  return d.join('');
}
function cnpj(base: string) {
  const d = base.split('').map(Number);
  for (const w of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const r = w.reduce((a, x, i) => a + x * d[i], 0) % 11;
    d.push(r < 2 ? 0 : 11 - r);
  }
  return d.join('');
}

export async function clearAllData() {
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.revenue.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.product.deleteMany(),
    prisma.client.deleteMany(),
    prisma.supplier.deleteMany(),
  ]);
}

export async function seedDemo() {
  await clearAllData();
  const rand = rng(20261121);
  const vary = (base: number, spread = 0.1) => Math.round(base * (1 - spread + rand() * spread * 2) * 100) / 100;
  const today = todayStr();
  const firstMonth = addMonths(monthStart(today), -5);
  const D = (s: string) => toDate(s);

  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: 'Café Aroma & Grão (empresa fictícia)',
      document: cnpj('112223330001'),
      email: 'contato@aromaegrao.exemplo',
      phone: '1133334444',
      openingBalance: 8000,
      openingDate: D(firstMonth),
      dueSoonDays: 7,
      revenueCategories: JSON.stringify(DEFAULT_REVENUE_CATEGORIES),
      expenseCategories: JSON.stringify(DEFAULT_EXPENSE_CATEGORIES),
      productCategories: JSON.stringify(DEFAULT_PRODUCT_CATEGORIES),
      isDemo: true,
    },
    update: {
      companyName: 'Café Aroma & Grão (empresa fictícia)',
      document: cnpj('112223330001'),
      email: 'contato@aromaegrao.exemplo',
      phone: '1133334444',
      openingBalance: 8000,
      openingDate: D(firstMonth),
      dueSoonDays: 7,
      revenueCategories: JSON.stringify(DEFAULT_REVENUE_CATEGORIES),
      expenseCategories: JSON.stringify(DEFAULT_EXPENSE_CATEGORIES),
      productCategories: JSON.stringify(DEFAULT_PRODUCT_CATEGORIES),
      isDemo: true,
    },
  });

  /* ----------------------------- Clientes ----------------------------- */
  const clientData = [
    { name: 'Coworking Ponto Criativo Ltda', document: cnpj('445556660001'), phone: '11987654321', email: 'financeiro@pontocriativo.exemplo', address: 'Rua das Palmeiras, 120 — Centro, São Paulo/SP' },
    { name: 'Escritório Contábil Nunes & Lima', document: cnpj('223334440001'), phone: '11976543210', email: 'adm@nuneslima.exemplo', address: 'Av. Brasil, 1500, sala 32 — Jardins, São Paulo/SP' },
    { name: 'Mariana Souza Albuquerque', document: cpf('123456789'), phone: '11965432109', email: 'mariana.souza@email.exemplo', address: 'Rua Ipê Amarelo, 45 — Vila Mariana, São Paulo/SP' },
    { name: 'Restaurante Sabor da Terra', document: cnpj('334445550001'), phone: '11954321098', email: 'compras@sabordaterra.exemplo', address: 'Rua do Comércio, 300 — Pinheiros, São Paulo/SP' },
    { name: 'Carlos Eduardo Ferreira', document: cpf('987654321'), phone: '11943210987', email: 'carlos.ferreira@email.exemplo', address: 'Rua Girassol, 88 — Moema, São Paulo/SP' },
    { name: 'Hotel Boa Estadia Ltda', document: cnpj('556667770001'), phone: '1132109876', email: 'suprimentos@boaestadia.exemplo', address: 'Av. Paulista, 2000 — Bela Vista, São Paulo/SP' },
    { name: 'Juliana Martins Rocha', document: cpf('456789123'), phone: '11921098765', email: 'ju.martins@email.exemplo', address: 'Rua Aurora, 12 — Santana, São Paulo/SP' },
    { name: 'Clínica Bem Viver', document: cnpj('667778880001'), phone: '1131098765', email: 'recepcao@bemviver.exemplo', address: 'Rua Saúde, 77 — Saúde, São Paulo/SP' },
  ];
  const clients = [];
  for (const c of clientData) clients.push(await prisma.client.create({ data: c }));

  /* ---------------------------- Fornecedores ---------------------------- */
  const supplierData = [
    { name: 'Torrefação Serra Azul Ltda', document: cnpj('778889990001'), phone: '3534567890', email: 'vendas@serraazul.exemplo', address: 'Estrada do Café, km 12 — Sul de Minas/MG' },
    { name: 'Laticínios Vale Verde', document: cnpj('889990000001'), phone: '1145678901', email: 'pedidos@valeverde.exemplo', address: 'Rod. dos Laticínios, 500 — Bragança Paulista/SP' },
    { name: 'Embalagens Prime Ltda', document: cnpj('990001110001'), phone: '1156789012', email: 'comercial@embprime.exemplo', address: 'Rua Industrial, 900 — Guarulhos/SP' },
    { name: 'Distribuidora Doce Sabor', document: cnpj('101112130001'), phone: '1167890123', email: 'contato@docesabor.exemplo', address: 'Av. das Indústrias, 45 — Osasco/SP' },
    { name: 'Imobiliária Centro Sul', document: cnpj('121314150001'), phone: '1178901234', email: 'locacao@centrosul.exemplo', address: 'Rua XV de Novembro, 210 — Centro, São Paulo/SP' },
    { name: 'Utensílios Barista Pro', document: cnpj('131415160001'), phone: '1189012345', email: 'loja@baristapro.exemplo', address: 'Rua dos Baristas, 33 — Campinas/SP' },
  ];
  const suppliers = [];
  for (const s of supplierData) suppliers.push(await prisma.supplier.create({ data: s }));
  const [torrefacao, laticinios, embalagens, doceSabor, imobiliaria, baristaPro] = suppliers;

  /* ------------------------- Receitas e despesas ------------------------- */
  const revenues: Parameters<typeof prisma.revenue.create>[0]['data'][] = [];
  const expenses: Parameters<typeof prisma.expense.create>[0]['data'][] = [];

  for (let m = 0; m < 6; m++) {
    const month = addMonths(firstMonth, m);
    const day = (d: number) => `${month.slice(0, 8)}${pad(Math.min(d, Number(monthEnd(month).slice(8, 10))))}`;
    const growth = 1 + m * 0.045;
    const isCurrent = m === 5;

    // Vendas semanais no balcão
    for (const d of [7, 14, 21, 28]) {
      const date = day(d);
      if (date > today) continue;
      revenues.push({
        description: `Vendas no balcão — semana até ${date.slice(8, 10)}/${date.slice(5, 7)}`,
        amount: vary(3650 * growth, 0.12),
        category: 'Vendas no balcão',
        date: D(date),
        paymentMethod: rand() > 0.5 ? 'Cartão de débito' : 'PIX',
        status: 'RECEBIDO',
      });
    }
    // Vendas online
    for (const d of [10, 25]) {
      const date = day(d);
      if (date > today) continue;
      revenues.push({
        description: `Vendas da loja online — ${d <= 15 ? '1ª' : '2ª'} quinzena`,
        amount: vary(1250 * growth, 0.15),
        category: 'Vendas online',
        date: D(date),
        paymentMethod: 'Cartão de crédito',
        status: 'RECEBIDO',
      });
    }
    // Encomendas corporativas
    const orders = [
      { d: 3, c: clients[0], desc: 'Café para coworking (mensal)', v: 1450 },
      { d: 16, c: clients[3], desc: 'Fornecimento de café ao restaurante', v: 980 },
      { d: 22, c: clients[5], desc: 'Kits de café para quartos do hotel', v: 1680 },
    ];
    if (m % 2 === 1) orders.push({ d: 12, c: clients[1], desc: 'Coffee break — reunião de clientes', v: 640 });
    if (m === 2 || m === 4) orders.push({ d: 26, c: clients[7], desc: 'Cestas de café para pacientes', v: 720 });
    for (const o of orders) {
      const date = day(o.d);
      const pending = isCurrent && date >= addDays(today, -6);
      revenues.push({
        description: o.desc,
        amount: vary(o.v * growth, 0.08),
        category: 'Encomendas',
        date: D(date),
        clientId: o.c.id,
        paymentMethod: rand() > 0.4 ? 'Boleto' : 'PIX',
        status: pending ? 'PENDENTE' : 'RECEBIDO',
        notes: pending ? 'Aguardando pagamento do boleto.' : null,
      });
    }
    // Workshop de métodos (serviço)
    if (m >= 2) {
      const date = day(19);
      if (date <= today)
        revenues.push({
          description: 'Workshop de métodos de preparo',
          amount: vary(520, 0.1),
          category: 'Serviços',
          date: D(date),
          clientId: [clients[2], clients[4], clients[6]][m % 3].id,
          paymentMethod: 'PIX',
          status: 'RECEBIDO',
        });
    }

    // Despesas fixas e variáveis
    const bills = [
      { d: 5, desc: 'Aluguel do ponto comercial', cat: 'Aluguel', v: 3200, s: imobiliaria, pm: 'Boleto', fixed: true },
      { d: 5, desc: 'Folha de pagamento (2 colaboradores)', cat: 'Salários', v: 5400, s: null, pm: 'Transferência', fixed: true },
      { d: 10, desc: 'Compra de café em grãos', cat: 'Fornecedores', v: 2900 * growth, s: torrefacao, pm: 'Boleto' },
      { d: 12, desc: 'Conta de energia elétrica e água', cat: 'Energia e água', v: 860, s: null, pm: 'Boleto' },
      { d: 15, desc: 'Internet fibra e telefone', cat: 'Internet e telefone', v: 189.9, s: null, pm: 'Boleto', fixed: true },
      { d: 18, desc: 'Anúncios em redes sociais', cat: 'Marketing', v: 380, s: null, pm: 'Cartão de crédito' },
      { d: 20, desc: 'Leite e derivados', cat: 'Fornecedores', v: 920 * growth, s: laticinios, pm: 'PIX' },
      { d: 20, desc: 'DAS — Simples Nacional', cat: 'Impostos', v: 1050 * growth, s: null, pm: 'Boleto' },
      { d: 23, desc: 'Doces e salgados para revenda', cat: 'Fornecedores', v: 760 * growth, s: doceSabor, pm: 'PIX' },
      { d: 25, desc: 'Embalagens e copos descartáveis', cat: 'Fornecedores', v: 430, s: embalagens, pm: 'Boleto' },
    ];
    if (m === 1) bills.push({ d: 14, desc: 'Manutenção da máquina de espresso', cat: 'Manutenção', v: 690, s: baristaPro, pm: 'PIX' });
    if (m === 4) bills.push({ d: 8, desc: 'Moedor de café profissional', cat: 'Manutenção', v: 1890, s: baristaPro, pm: 'Cartão de crédito' });

    for (const b of bills) {
      const due = day(b.d);
      const amount = 'fixed' in b && b.fixed ? b.v : vary(b.v, 0.08);
      let status: 'PAGO' | 'PENDENTE' = 'PAGO';
      let paymentDate: string | null = addDays(due, rand() > 0.8 ? -2 : 0);
      if (isCurrent) {
        const keepOverdue = b.desc.startsWith('Conta de energia') || b.desc.startsWith('Leite');
        if (due > today || keepOverdue) {
          status = 'PENDENTE';
          paymentDate = null;
        } else if (paymentDate > today) paymentDate = today;
      }
      expenses.push({
        description: b.desc,
        amount,
        category: b.cat,
        dueDate: D(due),
        paymentDate: paymentDate ? D(paymentDate) : null,
        supplierId: b.s?.id ?? null,
        paymentMethod: b.pm,
        status,
        notes: status === 'PENDENTE' && due < today ? 'Pagamento esquecido — verificar juros.' : null,
      });
    }
  }

  // Contas do próximo mês já lançadas (contas a pagar futuras)
  const next = addMonths(monthStart(today), 1);
  expenses.push(
    { description: 'Aluguel do ponto comercial', amount: 3200, category: 'Aluguel', dueDate: D(`${next.slice(0, 8)}05`), supplierId: imobiliaria.id, paymentMethod: 'Boleto', status: 'PENDENTE' },
    { description: 'Folha de pagamento (2 colaboradores)', amount: 5400, category: 'Salários', dueDate: D(`${next.slice(0, 8)}05`), paymentMethod: 'Transferência', status: 'PENDENTE' },
  );
  // Recebimento futuro previsto
  revenues.push({
    description: 'Encomenda de cestas de Natal',
    amount: 2350,
    category: 'Encomendas',
    date: D(addDays(today, 12)),
    clientId: clients[1].id,
    paymentMethod: 'Boleto',
    status: 'PENDENTE',
    notes: '50% na entrega. Pedido confirmado por e-mail.',
  });

  for (const r of revenues) await prisma.revenue.create({ data: r });
  for (const e of expenses) await prisma.expense.create({ data: e });

  /* ------------------------------ Produtos ------------------------------ */
  const productData = [
    { name: 'Café Especial Bourbon Amarelo 250g', sku: 'CAF-001', category: 'Cafés', cost: 22.5, sale: 42.9, init: 60, sold1: 28, restock: 40, sold2: 34, min: 15, s: torrefacao, desc: 'Grãos torrados, notas de caramelo e frutas amarelas.' },
    { name: 'Café Gourmet Moído 500g', sku: 'CAF-002', category: 'Cafés', cost: 18.9, sale: 34.9, init: 80, sold1: 45, restock: 30, sold2: 57, min: 12, s: torrefacao, desc: 'Torra média, ideal para coado.' },
    { name: 'Café Descafeinado 250g', sku: 'CAF-003', category: 'Cafés', cost: 24.0, sale: 44.9, init: 25, sold1: 9, restock: 0, sold2: 10, min: 5, s: torrefacao, desc: null },
    { name: 'Cápsulas Compatíveis (10 un.)', sku: 'CAF-004', category: 'Cafés', cost: 11.5, sale: 24.9, init: 120, sold1: 60, restock: 50, sold2: 72, min: 30, s: torrefacao, desc: null },
    { name: 'Chá de Hibisco a Granel 100g', sku: 'CHA-001', category: 'Chás', cost: 8.2, sale: 19.9, init: 40, sold1: 12, restock: 0, sold2: 9, min: 8, s: doceSabor, desc: null },
    { name: 'Chá Verde com Hortelã 100g', sku: 'CHA-002', category: 'Chás', cost: 9.4, sale: 21.9, init: 30, sold1: 14, restock: 0, sold2: 12, min: 6, s: doceSabor, desc: null },
    { name: 'Prensa Francesa 600ml', sku: 'ACE-001', category: 'Acessórios', cost: 58.0, sale: 119.9, init: 12, sold1: 4, restock: 6, sold2: 5, min: 3, s: baristaPro, desc: 'Vidro borossilicato e aço inox.' },
    { name: 'Coador de Porcelana V60', sku: 'ACE-002', category: 'Acessórios', cost: 42.0, sale: 89.9, init: 10, sold1: 5, restock: 0, sold2: 4, min: 3, s: baristaPro, desc: null },
    { name: 'Filtros de Papel nº 102 (100 un.)', sku: 'ACE-003', category: 'Acessórios', cost: 6.5, sale: 14.9, init: 90, sold1: 40, restock: 30, sold2: 35, min: 20, s: embalagens, desc: null },
    { name: 'Moedor Manual de Café', sku: 'ACE-004', category: 'Acessórios', cost: 95.0, sale: 189.9, init: 6, sold1: 2, restock: 0, sold2: 2, min: 2, s: baristaPro, desc: 'Mó cerâmica ajustável.' },
    { name: 'Biscoitos Amanteigados 200g', sku: 'ALI-001', category: 'Alimentos', cost: 7.8, sale: 16.9, init: 50, sold1: 22, restock: 20, sold2: 26, min: 10, s: doceSabor, desc: null },
    { name: 'Caixa Presente Kraft', sku: 'EMB-001', category: 'Embalagens', cost: 4.2, sale: 9.9, init: 70, sold1: 18, restock: 0, sold2: 15, min: 15, s: embalagens, desc: 'Para kits e cestas.' },
  ];

  const d0 = addDays(firstMonth, 2);
  const d1 = addDays(firstMonth, 45);
  const d2 = addDays(firstMonth, 95);
  const d3 = addDays(today, -4);

  for (const p of productData) {
    const q1 = p.init;
    const q2 = q1 - p.sold1;
    const q3 = q2 + p.restock;
    const q4 = q3 - p.sold2;
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        category: p.category,
        description: p.desc,
        quantity: q4,
        minStock: p.min,
        costPrice: p.cost,
        salePrice: p.sale,
        supplierId: p.s.id,
        createdAt: D(d0),
      },
    });
    const moves = [
      { type: 'ENTRADA', quantity: p.init, unitValue: p.cost, balanceAfter: q1, date: d0, notes: 'Estoque inicial' },
      { type: 'SAIDA', quantity: p.sold1, unitValue: p.sale, balanceAfter: q2, date: d1, notes: 'Vendas do período' },
      ...(p.restock ? [{ type: 'ENTRADA', quantity: p.restock, unitValue: p.cost, balanceAfter: q3, date: d2, notes: 'Reposição de mercadoria' }] : []),
      { type: 'SAIDA', quantity: p.sold2, unitValue: p.sale, balanceAfter: q4, date: d3, notes: 'Vendas do período' },
    ];
    for (const mv of moves) await prisma.stockMovement.create({ data: { ...mv, date: D(mv.date), productId: product.id } });
  }
}
