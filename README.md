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

Pelo sistema, em **Configurações**, também é possível apagar todos os dados (para começar com os dados reais) ou restaurar a demonstração.

## Arquitetura

```
FinanceTech/
├── server/                 Back-end — Node.js + Express + TypeScript
│   ├── prisma/schema.prisma   Modelo de dados (Prisma ORM)
│   ├── prisma/seed.ts         Carga dos dados demonstrativos
│   └── src/
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

O ambiente não tinha PostgreSQL, então o projeto usa **SQLite** (arquivo `server/prisma/financetech.db`), que persiste os dados entre reinícios. O esquema Prisma é compatível com PostgreSQL. Para migrar:

1. Em `server/prisma/schema.prisma`, troque `provider = "sqlite"` por `provider = "postgresql"`.
2. Em `server/.env`, defina `DATABASE_URL="postgresql://usuario:senha@localhost:5432/financetech"`.
3. Execute `npm run db:setup -w server`.

## Regras de negócio importantes

- **Fluxo de caixa e saldo** consideram apenas valores efetivamente **recebidos** (receitas "Recebido", pela data de recebimento) e **pagos** (despesas "Pago", pela data de pagamento). Lançamentos pendentes aparecem separados como "previsto".
- **Saldo atual** = saldo inicial (Configurações) + entradas realizadas − saídas realizadas.
- **Despesas atrasadas:** uma despesa pendente cujo vencimento já passou é marcada como "Atrasado" automaticamente. Contas que vencem dentro do prazo configurado (padrão: 7 dias) são destacadas.
- **Estoque:** a quantidade só muda por movimentações (entradas e saídas), preservando o histórico. Uma saída que deixaria o estoque negativo é bloqueada pela API e só é aceita com confirmação explícita do usuário. Entradas e saídas podem gerar automaticamente a despesa de compra ou a receita de venda.
- **Exclusões** pedem confirmação. Excluir um cliente ou fornecedor mantém os lançamentos, apenas sem o vínculo.
- **Insights** são calculados apenas com os dados cadastrados. Cada análise só aparece se houver dados suficientes para sustentá-la (ex.: comparação com o mesmo período do mês anterior, tendência do saldo nos últimos 3 meses, contas atrasadas ou a vencer, estoque baixo, projeção de 30 dias, concentração de clientes).

## Dados demonstrativos

Os dados de exemplo são **fictícios**: a cafeteria "Café Aroma & Grão (empresa fictícia)", com 6 meses de vendas e despesas gerados a partir da data atual, 12 produtos (alguns com estoque baixo), 8 clientes, 6 fornecedores e contas pagas, pendentes e atrasadas. O sistema mostra o aviso "Dados fictícios de demonstração" enquanto eles estiverem carregados.
