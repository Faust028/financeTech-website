import { z } from 'zod';
import { isDateStr } from './dates.js';

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export function isValidCPF(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function isValidCNPJ(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(c[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

const optionalText = z
  .string()
  .trim()
  .max(1000, 'Texto muito longo.')
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const dateStr = z.string({ required_error: 'Informe a data.' }).refine(isDateStr, 'Data inválida.');
const money = z.coerce
  .number({ invalid_type_error: 'Informe um valor válido.' })
  .finite('Informe um valor válido.')
  .positive('O valor deve ser maior que zero.')
  .max(1_000_000_000, 'Valor muito alto.')
  .transform((v) => Math.round(v * 100) / 100);
const optionalId = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .nullable()
  .transform((v) => v ?? null);
const required = (msg: string) => z.string({ required_error: msg }).trim().min(1, msg).max(200, 'Texto muito longo.');

export const documentField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? onlyDigits(v) : null))
  .refine(
    (v) => !v || (v.length === 11 ? isValidCPF(v) : v.length === 14 ? isValidCNPJ(v) : false),
    'CPF/CNPJ inválido.',
  );

const phoneField = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? onlyDigits(v) : null))
  .refine((v) => !v || v.length === 10 || v.length === 11, 'Telefone inválido. Use DDD + número.');

const emailField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.');

export const partySchema = z.object({
  name: required('Informe o nome ou razão social.'),
  document: documentField,
  phone: phoneField,
  email: emailField,
  address: optionalText,
});

export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'Outro'] as const;
const paymentMethod = z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Selecione a forma de pagamento.' }) });

export const revenueSchema = z.object({
  description: required('Informe a descrição.'),
  amount: money,
  category: required('Selecione a categoria.'),
  date: dateStr,
  clientId: optionalId,
  paymentMethod,
  status: z.enum(['RECEBIDO', 'PENDENTE'], { errorMap: () => ({ message: 'Selecione o status.' }) }),
  notes: optionalText,
});

export const expenseSchema = z
  .object({
    description: required('Informe a descrição.'),
    amount: money,
    category: required('Selecione a categoria.'),
    dueDate: dateStr,
    paymentDate: z
      .string()
      .optional()
      .nullable()
      .transform((v) => v || null)
      .refine((v) => v === null || isDateStr(v), 'Data inválida.'),
    supplierId: optionalId,
    paymentMethod,
    status: z.enum(['PAGO', 'PENDENTE'], { errorMap: () => ({ message: 'Selecione o status.' }) }),
    notes: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.status === 'PAGO' && !v.paymentDate)
      ctx.addIssue({ code: 'custom', path: ['paymentDate'], message: 'Informe a data de pagamento.' });
  })
  .transform((v) => ({ ...v, paymentDate: v.status === 'PAGO' ? v.paymentDate : null }));

const nonNegMoney = z.coerce
  .number({ invalid_type_error: 'Informe um valor válido.' })
  .finite('Informe um valor válido.')
  .min(0, 'O valor não pode ser negativo.')
  .transform((v) => Math.round(v * 100) / 100);

export const productSchema = z.object({
  name: required('Informe o nome do produto.'),
  sku: required('Informe o código/SKU.').transform((v) => v.toUpperCase()),
  category: required('Selecione a categoria.'),
  description: optionalText,
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantidade inválida.' })
    .int('Use números inteiros.')
    .min(0, 'A quantidade inicial não pode ser negativa.')
    .default(0),
  minStock: z.coerce.number({ invalid_type_error: 'Valor inválido.' }).int('Use números inteiros.').min(0, 'Não pode ser negativo.'),
  costPrice: nonNegMoney,
  salePrice: nonNegMoney,
  supplierId: optionalId,
});

export const movementSchema = z.object({
  type: z.enum(['ENTRADA', 'SAIDA'], { errorMap: () => ({ message: 'Selecione o tipo.' }) }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantidade inválida.' })
    .int('Use números inteiros.')
    .positive('Informe uma quantidade maior que zero.')
    .max(1_000_000, 'Quantidade muito alta.'),
  unitValue: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional().nullable(),
  date: dateStr,
  notes: optionalText,
  confirmNegative: z.boolean().optional().default(false),
  createFinancial: z.boolean().optional().default(false),
  paymentMethod: paymentMethod.optional().default('PIX'),
  financialStatus: z.enum(['REALIZADO', 'PENDENTE']).optional().default('REALIZADO'),
});

const categoryList = z
  .array(z.string().trim().min(1).max(60))
  .min(1, 'Mantenha ao menos uma categoria.')
  .transform((arr) => Array.from(new Set(arr)));

export const settingsSchema = z.object({
  companyName: required('Informe o nome da empresa.'),
  document: documentField,
  email: emailField,
  phone: phoneField,
  openingBalance: z.coerce.number({ invalid_type_error: 'Valor inválido.' }).finite('Valor inválido.'),
  openingDate: dateStr,
  dueSoonDays: z.coerce
    .number({ invalid_type_error: 'Valor inválido.' })
    .int('Use números inteiros.')
    .min(1, 'Mínimo de 1 dia.')
    .max(60, 'Máximo de 60 dias.'),
  revenueCategories: categoryList,
  expenseCategories: categoryList,
  productCategories: categoryList,
});

export const rangeQuery = z.object({
  from: z
    .string()
    .optional()
    .refine((v) => !v || isDateStr(v), 'Data inicial inválida.'),
  to: z
    .string()
    .optional()
    .refine((v) => !v || isDateStr(v), 'Data final inválida.'),
});
