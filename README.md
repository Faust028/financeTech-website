# FinanceTech

Plataforma de gestão financeira e administrativa para pequenos empreendedores, MEIs e pequenas empresas: receitas, despesas, fluxo de caixa, estoque, clientes, fornecedores, relatórios e análises automáticas (FinanceTech Insights).

## Como executar

Pré-requisito: **Node.js 20+** (testado com Node 24).

```powershell
npm run setup
```

Instala as dependências, cria o banco local (SQLite) e carrega os **dados demonstrativos fictícios**.

```powershell
npm run dev
```

- Aplicação: http://localhost:5173
- API: http://localhost:3333/api

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run seed` | Recarrega os dados fictícios (apaga os dados atuais) |
| `npm run typecheck` | Verifica os tipos do back-end e do front-end |
| `npm run build` | Gera o build de produção do front-end |
| `npm start` | Sobe a API servindo também o front-end compilado em http://localhost:3333 |
| `npm run preview -w client` | Serve o build de produção em http://localhost:4173 (com a API local) |
| `npm run vercel-build` | Build usado pela Vercel (migrações + Prisma Client + front-end) |

Pelo sistema, em **Configurações**, também é possível apagar todos os dados (para começar com os dados reais) ou restaurar a demonstração.

## Arquitetura

```
FinanceTech/
├── vercel.json             Configuração de deploy (build, saída, função e rotas)
├── api/index.ts            Serverless Function da Vercel → exporta o app Express
├── server/                 Back-end — Node.js + Express + TypeScript
│   ├── prisma/schema.prisma   Modelo de dados (PostgreSQL; variante SQLite gerada p/ dev)
│   ├── prisma/migrations/     Migrações do PostgreSQL (aplicadas no deploy)
│   ├── prisma/seed.ts         Carga dos dados demonstrativos
│   ├── scripts/prisma.mjs     Roda o Prisma escolhendo PostgreSQL ou SQLite pela DATABASE_URL
│   └── src/
│       ├── app.ts             App Express (rotas /api) — usado local e na Vercel
│       ├── index.ts           Servidor local (app.listen) — não usado na Vercel
│       ├── routes/            Rotas REST (CRUD, dashboard, fluxo, relatórios)
│       ├── services/          Regras de negócio: ledger (saldo/caixa), analytics,
│       │                      insights, demo e configurações
│       └── lib/               Validação (zod, CPF/CNPJ), datas, erros, serialização
└── client/                 Front-end — React + TypeScript + Vite
    └── src/
        ├── pages/             Dashboard, Receitas, Despesas, Fluxo de Caixa, Estoque,
        │                      Relatórios, Clientes, Fornecedores, Configurações, Insights
        ├── components/        Layout (sidebar), UI (botões, campos com máscara,
        │                      modais, toasts, confirmações), gráficos
        ├── hooks/             Busca de dados e contexto de configurações
        └── lib/               API, formatação pt-BR, máscaras, exportação PDF/Excel
```

**Tecnologias:** React 18, TypeScript, Tailwind CSS 4, Lucide React, Recharts, Express, Prisma, Zod, jsPDF e SheetJS (exportação).

### Banco de dados

- **Produção (Vercel): PostgreSQL** (Neon, Supabase, Vercel Postgres/Marketplace, etc.). O sistema de arquivos das funções serverless é somente leitura e temporário, então SQLite não serve em produção.
- **Desenvolvimento local:** sem configurar nada, usa **SQLite** (`server/prisma/financetech.db`). Para usar PostgreSQL localmente, basta colocar uma URL `postgresql://...` em `DATABASE_URL` no `server/.env` e rodar `npm run db:migrate:deploy -w server`.

O `schema.prisma` é a fonte única (PostgreSQL). Quando `DATABASE_URL` começa com `file:`, o `scripts/prisma.mjs` gera automaticamente a variante SQLite (`schema.sqlite.prisma`, fora do git).

## Deploy na Vercel

Frontend e backend ficam em **um único projeto Vercel** (sem o recurso de Multisserviços):

- O front-end Vite é gerado em `client/dist` e servido como site estático.
- A API Express roda como **uma Serverless Function** (`api/index.ts`). O `vercel.json` encaminha `/api/*` para ela; as demais rotas caem em `index.html` (SPA).
- No build, as migrações do PostgreSQL são aplicadas (`prisma migrate deploy`).

### Configuração do projeto na Vercel

| Campo | Valor |
| --- | --- |
| Root Directory | `./` (raiz do repositório) |
| Framework Preset | Other |
| Install Command | `npm install` (já definido no `vercel.json`) |
| Build Command | `npm run vercel-build` (já definido no `vercel.json`) |
| Output Directory | `client/dist` (já definido no `vercel.json`) |
| Node.js Version | 22.x |

### Variáveis de ambiente (Settings → Environment Variables)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL do PostgreSQL usada pela API. Em provedores com pool (Neon/Supabase), use a URL **pooled**, ex.: `postgresql://usuario:senha@host-pooler/db?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | Recomendada | URL **direta** (sem pool) usada pelas migrações no build. Se ausente, usa `DATABASE_URL`. |
| `APP_TIMEZONE` | Não | Fuso para "hoje" (vencimentos/atrasos). Padrão `America/Sao_Paulo`. |

Marque as variáveis para **Production** e **Preview** (o build precisa delas para aplicar as migrações). Nunca coloque essas URLs no código ou em arquivos versionados.

### Passo a passo

1. Crie um banco PostgreSQL (ex.: Neon — gratuito; ou em Vercel → Storage → Marketplace → Neon/Supabase, que já cadastra as variáveis).
2. Envie o repositório para o GitHub.
3. Na Vercel: **Add New → Project** → importe o repositório. Mantenha o Root Directory na raiz; se aparecer a sugestão de múltiplos serviços, ignore-a — o `vercel.json` já define tudo.
4. Cadastre `DATABASE_URL` (e `DIRECT_URL`) em Environment Variables.
5. Clique em **Deploy**. O build aplica as migrações, gera o Prisma Client e compila o front-end.
6. Teste `https://SEU-PROJETO.vercel.app/api/health/db` → deve responder `{"ok":true,"database":"conectado"}`.
7. O banco de produção começa **vazio** (sem dados fictícios). Para apresentar o sistema com a demonstração, use **Configurações → Restaurar demonstração**; para usar com dados reais, comece a cadastrar.

### Limitações consideradas

- Não há processos contínuos: a API só executa quando recebe requisições (sem `app.listen` na Vercel).
- Nada é gravado em disco na Vercel; todos os dados ficam no PostgreSQL. Os relatórios PDF/Excel são gerados no navegador.
- O Prisma Client é reutilizado entre invocações (singleton) e a restauração da demo usa inserções em lote, para respeitar o tempo e o número de conexões das funções.

## Regras de negócio importantes

- **Fluxo de caixa e saldo** consideram apenas valores efetivamente **recebidos** (receitas "Recebido", pela data de recebimento) e **pagos** (despesas "Pago", pela data de pagamento). Lançamentos pendentes aparecem separados como "previsto".
- **Saldo atual** = saldo inicial (Configurações) + entradas realizadas − saídas realizadas.
- **Despesas atrasadas:** uma despesa pendente cujo vencimento já passou é marcada como "Atrasado" automaticamente. Contas que vencem dentro do prazo configurado (padrão: 7 dias) são destacadas.
- **Estoque:** a quantidade só muda por movimentações (entradas e saídas), preservando o histórico. Uma saída que deixaria o estoque negativo é bloqueada pela API e só é aceita com confirmação explícita do usuário. Entradas e saídas podem gerar automaticamente a despesa de compra ou a receita de venda.
- **Exclusões** pedem confirmação. Excluir um cliente ou fornecedor mantém os lançamentos, apenas sem o vínculo.
- **Insights** são calculados apenas com os dados cadastrados. Cada análise só aparece se houver dados suficientes para sustentá-la (ex.: comparação com o mesmo período do mês anterior, tendência do saldo nos últimos 3 meses, contas atrasadas ou a vencer, estoque baixo, projeção de 30 dias, concentração de clientes).

## Dados demonstrativos

Os dados de exemplo são **fictícios**: a cafeteria "Café Aroma & Grão (empresa fictícia)", com 6 meses de vendas e despesas gerados a partir da data atual, 12 produtos (alguns com estoque baixo), 8 clientes, 6 fornecedores e contas pagas, pendentes e atrasadas. O sistema mostra o aviso "Dados fictícios de demonstração" enquanto eles estiverem carregados.
