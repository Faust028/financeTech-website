import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownCircle, BellRing, CheckCircle2, CircleDollarSign, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { api, ApiError, qs } from '../lib/api';
import { date, money, today } from '../lib/format';
import { PAYMENT_METHODS, type Expense, type Party, type PaymentMethod } from '../lib/types';
import { Button } from '../components/ui/Button';
import { FormField, Input, MoneyInput, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useFeedback } from '../components/ui/Feedback';
import { EmptyState, ErrorState, PageHeader, Spinner, StatCard, StatusBadge, Table, Td, Th } from '../components/ui/misc';
import { DateRangeInputs, FilterBar, FilterSelect, SearchInput } from '../components/FilterBar';

interface FormState {
  description: string;
  amount: number | null;
  category: string;
  dueDate: string;
  paymentDate: string;
  supplierId: string;
  paymentMethod: PaymentMethod;
  status: 'PAGO' | 'PENDENTE';
  notes: string;
}

const empty = (category = ''): FormState => ({
  description: '',
  amount: null,
  category,
  dueDate: today(),
  paymentDate: '',
  supplierId: '',
  paymentMethod: 'Boleto',
  status: 'PENDENTE',
  notes: '',
});

function ExpenseForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Expense | null; onSaved: () => void }) {
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const suppliers = useApi<Party[]>(open ? '/suppliers' : null);
  const [form, setForm] = useState<FormState>(empty());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            description: editing.description,
            amount: editing.amount,
            category: editing.category,
            dueDate: editing.dueDate,
            paymentDate: editing.paymentDate ?? '',
            supplierId: editing.supplierId ? String(editing.supplierId) : '',
            paymentMethod: editing.paymentMethod,
            status: editing.storedStatus,
            notes: editing.notes ?? '',
          }
        : empty(settings?.expenseCategories[0]),
    );
  }, [open, editing, settings]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'status' && v === 'PAGO' && !f.paymentDate) next.paymentDate = today();
      return next;
    });
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'Informe a descrição.';
    if (!form.amount || form.amount <= 0) errs.amount = 'Informe um valor maior que zero.';
    if (!form.category) errs.category = 'Selecione a categoria.';
    if (!form.dueDate) errs.dueDate = 'Informe o vencimento.';
    if (form.status === 'PAGO' && !form.paymentDate) errs.paymentDate = 'Informe a data de pagamento.';
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      const body = { ...form, supplierId: form.supplierId ? Number(form.supplierId) : null, paymentDate: form.status === 'PAGO' ? form.paymentDate : null };
      if (editing) await api.put(`/expenses/${editing.id}`, body);
      else await api.post('/expenses', body);
      toast('success', editing ? 'Despesa atualizada' : 'Despesa cadastrada', `${form.description} · ${money(form.amount)}`);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível salvar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const categories = settings?.expenseCategories ?? [];
  const catOptions = form.category && !categories.includes(form.category) ? [form.category, ...categories] : categories;
  const willBeLate = form.status === 'PENDENTE' && form.dueDate && form.dueDate < today();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar despesa' : 'Nova despesa'}
      subtitle="Registre uma conta a pagar ou um gasto já realizado"
      icon={<ArrowDownCircle className="h-5 w-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar despesa'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Descrição" required error={errors.description} className="sm:col-span-2">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Conta de energia" invalid={!!errors.description} autoFocus />
        </FormField>
        <FormField label="Valor" required error={errors.amount}>
          <MoneyInput value={form.amount} onChange={(v) => set('amount', v)} invalid={!!errors.amount} />
        </FormField>
        <FormField label="Categoria" required error={errors.category}>
          <Select value={form.category} onChange={(e) => set('category', e.target.value)} invalid={!!errors.category}>
            <option value="">Selecione...</option>
            {catOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Status" required hint={willBeLate ? undefined : 'Contas pendentes com vencimento passado ficam "Atrasadas" automaticamente.'}>
          <div className="grid grid-cols-2 gap-2">
            {(['PAGO', 'PENDENTE'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => set('status', s)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                  form.status === s ? (s === 'PAGO' ? 'border-pos-600 bg-pos-50 text-pos-700' : 'border-warn-600 bg-warn-50 text-warn-700') : 'border-line text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s === 'PAGO' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {s === 'PAGO' ? 'Pago' : 'Pendente'}
              </button>
            ))}
          </div>
          {willBeLate && (
            <span className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-neg-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Vencimento já passou: a conta ficará como atrasada.
            </span>
          )}
        </FormField>
        <FormField label="Forma de pagamento" required error={errors.paymentMethod}>
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Data de vencimento" required error={errors.dueDate}>
          <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} invalid={!!errors.dueDate} />
        </FormField>
        <FormField label="Data de pagamento" required={form.status === 'PAGO'} error={errors.paymentDate} hint={form.status === 'PENDENTE' ? 'Preenchida ao marcar como pago' : undefined}>
          <Input type="date" value={form.status === 'PAGO' ? form.paymentDate : ''} disabled={form.status !== 'PAGO'} onChange={(e) => set('paymentDate', e.target.value)} invalid={!!errors.paymentDate} />
        </FormField>
        <FormField label="Fornecedor" hint="Opcional" className="sm:col-span-2">
          <Select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
            <option value="">Sem fornecedor vinculado</option>
            {suppliers.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Observações" className="sm:col-span-2" error={errors.notes}>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Informações adicionais (opcional)" />
        </FormField>
      </form>
    </Modal>
  );
}

export default function ExpensesPage() {
  const [params, setParams] = useSearchParams();
  const { settings, version } = useSettings();
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const debounced = useDebounced(search);

  const { data, loading, error, reload } = useApi<Expense[]>(`/expenses${qs({ search: debounced, from, to, category, status, v: version })}`);
  // alertas são calculados sobre todas as contas, independentemente dos filtros
  const alerts = useApi<Expense[]>(`/expenses${qs({ status: 'ATRASADO', v: version })}`);
  const pendingAll = useApi<Expense[]>(`/expenses${qs({ status: 'PENDENTE', v: version })}`);

  useEffect(() => {
    if (params.get('status')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadAll = () => {
    reload();
    alerts.reload();
    pendingAll.reload();
  };

  const totals = useMemo(() => {
    const list = data ?? [];
    const sum = (f: (r: Expense) => boolean) => list.filter(f).reduce((a, r) => a + r.amount, 0);
    return { total: sum(() => true), paid: sum((r) => r.status === 'PAGO'), open: sum((r) => r.status !== 'PAGO') };
  }, [data]);

  const overdue = alerts.data ?? [];
  const dueSoon = (pendingAll.data ?? []).filter((e) => e.dueSoon);
  const hasFilters = !!(search || from || to || category || status);
  const clear = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setCategory('');
    setStatus('');
  };

  async function remove(r: Expense) {
    const ok = await confirm({
      title: 'Excluir despesa?',
      message: (
        <>
          A despesa <b>{r.description}</b> de <b>{money(r.amount)}</b> será excluída permanentemente.
        </>
      ),
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.del(`/expenses/${r.id}`);
      toast('success', 'Despesa excluída');
      reloadAll();
    } catch (e) {
      toast('error', 'Erro ao excluir', e instanceof ApiError ? e.message : undefined);
    }
  }

  async function markPaid(r: Expense) {
    const ok = await confirm({
      title: 'Registrar pagamento?',
      message: (
        <>
          <b>{r.description}</b> ({money(r.amount)}) será marcada como paga hoje, {date(today())}, e sairá do saldo de caixa.
        </>
      ),
      confirmLabel: 'Confirmar pagamento',
      tone: 'primary',
    });
    if (!ok) return;
    try {
      await api.patch(`/expenses/${r.id}/pay`, { date: today() });
      toast('success', 'Pagamento registrado', `${money(r.amount)} debitados do caixa.`);
      reloadAll();
    } catch (e) {
      toast('error', 'Erro ao registrar', e instanceof ApiError ? e.message : undefined);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<ArrowDownCircle className="h-5 w-5" />}
        title="Despesas"
        description="Controle suas contas a pagar e gastos do negócio. Acompanhe vencimentos e evite juros por atraso."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nova despesa
          </Button>
        }
      />

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {overdue.length > 0 && (
            <button onClick={() => setStatus('ATRASADO')} className="flex items-center gap-3 rounded-2xl border border-neg-600/20 bg-neg-50 p-4 text-left transition hover:shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neg-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-neg-700">
                  {overdue.length} conta(s) atrasada(s) · {money(overdue.reduce((a, e) => a + e.amount, 0))}
                </p>
                <p className="text-xs text-neg-700/80">Clique para ver e regularizar os pagamentos.</p>
              </div>
            </button>
          )}
          {dueSoon.length > 0 && (
            <button onClick={() => setStatus('PENDENTE')} className="flex items-center gap-3 rounded-2xl border border-warn-600/25 bg-warn-50 p-4 text-left transition hover:shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-600 text-white">
                <BellRing className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-warn-700">
                  {dueSoon.length} conta(s) vencendo em até {settings?.dueSoonDays ?? 7} dias · {money(dueSoon.reduce((a, e) => a + e.amount, 0))}
                </p>
                <p className="text-xs text-warn-700/80">Programe os pagamentos para não atrasar.</p>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={hasFilters ? 'Total filtrado' : 'Total de despesas'} value={money(totals.total)} icon={<CircleDollarSign className="h-[18px] w-[18px]" />} tone="blue" hint={`${data?.length ?? 0} lançamento(s)`} />
        <StatCard label="Pago" value={money(totals.paid)} icon={<CheckCircle2 className="h-[18px] w-[18px]" />} tone="green" hint="Já saiu do caixa" />
        <StatCard label="Em aberto" value={money(totals.open)} icon={<Clock className="h-[18px] w-[18px]" />} tone="red" hint="Pendentes + atrasadas" />
      </div>

      <div className="card overflow-hidden">
        <FilterBar onClear={clear} canClear={hasFilters}>
          <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por descrição..." />
          <DateRangeInputs
            from={from}
            to={to}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
          <FilterSelect value={category} onChange={setCategory} label="Categoria">
            <option value="">Todas as categorias</option>
            {settings?.expenseCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={status} onChange={setStatus} label="Status">
            <option value="">Todos os status</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADO">Atrasado</option>
          </FilterSelect>
        </FilterBar>
        <p className="border-b border-line bg-slate-50/50 px-4 py-2 text-xs text-muted">O filtro de período considera a data de vencimento.</p>

        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<ArrowDownCircle className="h-6 w-6" />}
            title={hasFilters ? 'Nenhuma despesa encontrada' : 'Nenhuma despesa cadastrada'}
            description={hasFilters ? 'Ajuste ou limpe os filtros para ver outros lançamentos.' : 'Cadastre suas contas (aluguel, fornecedores, energia...) para controlar os vencimentos.'}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clear}>
                  Limpar filtros
                </Button>
              ) : (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Cadastrar despesa
                </Button>
              )
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Vencimento</Th>
                  <Th>Descrição</Th>
                  <Th>Categoria</Th>
                  <Th>Fornecedor</Th>
                  <Th>Status</Th>
                  <Th right>Valor</Th>
                  <Th right>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition ${r.status === 'ATRASADO' ? 'bg-neg-50/50 hover:bg-neg-50' : r.dueSoon ? 'bg-warn-50/50 hover:bg-warn-50' : 'hover:bg-slate-50/70'}`}
                  >
                    <Td className="whitespace-nowrap">
                      <span className="num text-slate-600">{date(r.dueDate)}</span>
                      {r.status === 'ATRASADO' && <p className="text-[11px] font-semibold text-neg-600">{-r.daysToDue} dia(s) de atraso</p>}
                      {r.dueSoon && <p className="text-[11px] font-semibold text-warn-700">{r.daysToDue === 0 ? 'Vence hoje' : `Vence em ${r.daysToDue} dia(s)`}</p>}
                    </Td>
                    <Td>
                      <p className="max-w-[240px] truncate font-semibold text-ink" title={r.description}>
                        {r.description}
                      </p>
                      <p className="text-xs text-muted">{r.paymentMethod}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{r.category}</Td>
                    <Td className="text-slate-600"><span className="block max-w-[170px] truncate" title={r.supplier?.name}>{r.supplier?.name ?? <span className="text-slate-300">—</span>}</span></Td>
                    <Td>
                      <StatusBadge status={r.status} />
                      {r.paymentDate && <p className="num mt-0.5 text-[11px] text-muted">em {date(r.paymentDate)}</p>}
                    </Td>
                    <Td right className="num font-bold whitespace-nowrap text-neg-600">
                      {money(r.amount)}
                    </Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
                        {r.status !== 'PAGO' && (
                          <Button size="icon" variant="ghost" title="Marcar como pago" aria-label="Marcar como pago" onClick={() => markPaid(r)} className="text-pos-600 hover:bg-pos-50 hover:text-pos-700">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => {
                            setEditing(r);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Excluir" aria-label="Excluir" onClick={() => remove(r)} className="hover:bg-neg-50 hover:text-neg-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/70">
                  <Td className="font-bold text-ink">Total</Td>
                  <Td className="text-xs text-muted">{data.length} lançamento(s)</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td right className="num font-extrabold whitespace-nowrap text-ink">
                    {money(totals.total)}
                  </Td>
                  <Td />
                </tr>
              </tfoot>
            </Table>
          </div>
        )}
      </div>

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={reloadAll} />
    </div>
  );
}
