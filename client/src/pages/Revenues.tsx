import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpCircle, CheckCircle2, CircleDollarSign, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { api, ApiError, qs } from '../lib/api';
import { date, money, today } from '../lib/format';
import { PAYMENT_METHODS, type Party, type PaymentMethod, type Revenue } from '../lib/types';
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
  date: string;
  clientId: string;
  paymentMethod: PaymentMethod;
  status: 'RECEBIDO' | 'PENDENTE';
  notes: string;
}

const empty = (category = ''): FormState => ({
  description: '',
  amount: null,
  category,
  date: today(),
  clientId: '',
  paymentMethod: 'PIX',
  status: 'RECEBIDO',
  notes: '',
});

function RevenueForm({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Revenue | null; onSaved: () => void }) {
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const clients = useApi<Party[]>(open ? '/clients' : null);
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
            date: editing.date,
            clientId: editing.clientId ? String(editing.clientId) : '',
            paymentMethod: editing.paymentMethod,
            status: editing.status,
            notes: editing.notes ?? '',
          }
        : empty(settings?.revenueCategories[0]),
    );
  }, [open, editing, settings]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'Informe a descrição.';
    if (!form.amount || form.amount <= 0) errs.amount = 'Informe um valor maior que zero.';
    if (!form.category) errs.category = 'Selecione a categoria.';
    if (!form.date) errs.date = 'Informe a data.';
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      const body = { ...form, clientId: form.clientId ? Number(form.clientId) : null };
      if (editing) await api.put(`/revenues/${editing.id}`, body);
      else await api.post('/revenues', body);
      toast('success', editing ? 'Receita atualizada' : 'Receita cadastrada', `${form.description} · ${money(form.amount)}`);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível salvar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const categories = settings?.revenueCategories ?? [];
  const catOptions = form.category && !categories.includes(form.category) ? [form.category, ...categories] : categories;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar receita' : 'Nova receita'}
      subtitle="Registre uma entrada de dinheiro do seu negócio"
      icon={<ArrowUpCircle className="h-5 w-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="revenue-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar receita'}
          </Button>
        </>
      }
    >
      <form id="revenue-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Descrição" required error={errors.description} className="sm:col-span-2">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ex.: Venda de café para evento" invalid={!!errors.description} autoFocus />
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
        <FormField label="Status" required>
          <div className="grid grid-cols-2 gap-2">
            {(['RECEBIDO', 'PENDENTE'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => set('status', s)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                  form.status === s
                    ? s === 'RECEBIDO'
                      ? 'border-pos-600 bg-pos-50 text-pos-700'
                      : 'border-warn-600 bg-warn-50 text-warn-700'
                    : 'border-line text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s === 'RECEBIDO' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {s === 'RECEBIDO' ? 'Recebido' : 'Pendente'}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label={form.status === 'RECEBIDO' ? 'Data de recebimento' : 'Data prevista de recebimento'} required error={errors.date}>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} invalid={!!errors.date} />
        </FormField>
        <FormField label="Cliente" hint="Opcional" error={errors.clientId}>
          <Select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">Sem cliente vinculado</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Forma de pagamento" required error={errors.paymentMethod}>
          <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
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

export default function RevenuesPage() {
  const [params, setParams] = useSearchParams();
  const { settings, version } = useSettings();
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Revenue | null>(null);
  const debounced = useDebounced(search);

  const { data, loading, error, reload } = useApi<Revenue[]>(`/revenues${qs({ search: debounced, from, to, category, status, v: version })}`);

  useEffect(() => {
    if (params.get('status')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const list = data ?? [];
    const sum = (f: (r: Revenue) => boolean) => list.filter(f).reduce((a, r) => a + r.amount, 0);
    return { total: sum(() => true), received: sum((r) => r.status === 'RECEBIDO'), pending: sum((r) => r.status === 'PENDENTE'), late: list.filter((r) => r.overdue).length };
  }, [data]);

  const hasFilters = !!(search || from || to || category || status);
  const clear = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setCategory('');
    setStatus('');
  };

  async function remove(r: Revenue) {
    const ok = await confirm({
      title: 'Excluir receita?',
      message: (
        <>
          A receita <b>{r.description}</b> de <b>{money(r.amount)}</b> será excluída permanentemente e deixará de compor saldos e relatórios.
        </>
      ),
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.del(`/revenues/${r.id}`);
      toast('success', 'Receita excluída');
      reload();
    } catch (e) {
      toast('error', 'Erro ao excluir', e instanceof ApiError ? e.message : undefined);
    }
  }

  async function markReceived(r: Revenue) {
    const ok = await confirm({
      title: 'Confirmar recebimento?',
      message: (
        <>
          <b>{r.description}</b> ({money(r.amount)}) será marcada como recebida hoje, {date(today())}, e entrará no saldo de caixa.
        </>
      ),
      confirmLabel: 'Confirmar recebimento',
      tone: 'primary',
    });
    if (!ok) return;
    try {
      await api.patch(`/revenues/${r.id}/receive`, { date: today() });
      toast('success', 'Recebimento registrado', `${money(r.amount)} adicionados ao caixa.`);
      reload();
    } catch (e) {
      toast('error', 'Erro ao registrar', e instanceof ApiError ? e.message : undefined);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<ArrowUpCircle className="h-5 w-5" />}
        title="Receitas"
        description="Registre e acompanhe todas as entradas de dinheiro: vendas, serviços e recebimentos de clientes."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nova receita
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={hasFilters ? 'Total filtrado' : 'Total de receitas'} value={money(totals.total)} icon={<CircleDollarSign className="h-[18px] w-[18px]" />} tone="blue" hint={`${data?.length ?? 0} lançamento(s)`} />
        <StatCard label="Recebido" value={money(totals.received)} icon={<CheckCircle2 className="h-[18px] w-[18px]" />} tone="green" hint="Já entrou no caixa" />
        <StatCard
          label="A receber"
          value={money(totals.pending)}
          icon={<Clock className="h-[18px] w-[18px]" />}
          tone="amber"
          hint={totals.late ? <span className="font-semibold text-warn-700">{totals.late} com data vencida</span> : 'Previsto, ainda não recebido'}
        />
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
            {settings?.revenueCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={status} onChange={setStatus} label="Status">
            <option value="">Todos os status</option>
            <option value="RECEBIDO">Recebido</option>
            <option value="PENDENTE">Pendente</option>
          </FilterSelect>
        </FilterBar>

        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<ArrowUpCircle className="h-6 w-6" />}
            title={hasFilters ? 'Nenhuma receita encontrada' : 'Nenhuma receita cadastrada'}
            description={hasFilters ? 'Ajuste ou limpe os filtros para ver outros lançamentos.' : 'Cadastre sua primeira receita para começar a acompanhar o faturamento do negócio.'}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clear}>
                  Limpar filtros
                </Button>
              ) : (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                  Cadastrar receita
                </Button>
              )
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Descrição</Th>
                  <Th>Categoria</Th>
                  <Th>Cliente</Th>
                  <Th>Status</Th>
                  <Th right>Valor</Th>
                  <Th right>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50/70">
                    <Td className="num whitespace-nowrap text-slate-600">{date(r.date)}</Td>
                    <Td>
                      <p className="max-w-[260px] truncate font-semibold text-ink" title={r.description}>
                        {r.description}
                      </p>
                      <p className="max-w-[260px] truncate text-xs text-muted">{r.paymentMethod}{r.notes ? ` · ${r.notes}` : ""}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{r.category}</Td>
                    <Td className="text-slate-600"><span className="block max-w-[170px] truncate" title={r.client?.name}>{r.client?.name ?? <span className="text-slate-300">—</span>}</span></Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={r.status} />
                        {r.overdue && <span className="text-[11px] font-semibold text-warn-700">Data vencida</span>}
                      </div>
                    </Td>
                    <Td right className="num font-bold whitespace-nowrap text-pos-700">
                      {money(r.amount)}
                    </Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
                        {r.status === 'PENDENTE' && (
                          <Button size="icon" variant="ghost" title="Marcar como recebido" aria-label="Marcar como recebido" onClick={() => markReceived(r)} className="text-pos-600 hover:bg-pos-50 hover:text-pos-700">
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

      <RevenueForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={reload} />
    </div>
  );
}
