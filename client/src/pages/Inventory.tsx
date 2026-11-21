import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, History, Package, PackagePlus, Pencil, Plus, Tag, Trash2, Wallet } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { api, ApiError, qs } from '../lib/api';
import { date, money, number, today } from '../lib/format';
import { PAYMENT_METHODS, type Party, type PaymentMethod, type Product, type StockMovement } from '../lib/types';
import { Button } from '../components/ui/Button';
import { FormField, Input, MoneyInput, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useFeedback } from '../components/ui/Feedback';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, StatCard, StatusBadge, Table, Tabs, Td, Th } from '../components/ui/misc';
import { FilterBar, FilterSelect, SearchInput } from '../components/FilterBar';

/* ------------------------------ Produto ------------------------------ */
interface ProductForm {
  name: string;
  sku: string;
  category: string;
  description: string;
  quantity: string;
  minStock: string;
  costPrice: number | null;
  salePrice: number | null;
  supplierId: string;
}

function ProductFormModal({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Product | null; onSaved: () => void }) {
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const suppliers = useApi<Party[]>(open ? '/suppliers' : null);
  const [form, setForm] = useState<ProductForm>({ name: '', sku: '', category: '', description: '', quantity: '0', minStock: '0', costPrice: null, salePrice: null, supplierId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            sku: editing.sku,
            category: editing.category,
            description: editing.description ?? '',
            quantity: String(editing.quantity),
            minStock: String(editing.minStock),
            costPrice: editing.costPrice,
            salePrice: editing.salePrice,
            supplierId: editing.supplierId ? String(editing.supplierId) : '',
          }
        : { name: '', sku: '', category: settings?.productCategories[0] ?? '', description: '', quantity: '0', minStock: '5', costPrice: null, salePrice: null, supplierId: '' },
    );
  }, [open, editing, settings]);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const margin = form.costPrice !== null && form.salePrice ? ((form.salePrice - form.costPrice) / form.salePrice) * 100 : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Informe o nome do produto.';
    if (!form.sku.trim()) errs.sku = 'Informe o código/SKU.';
    if (!form.category) errs.category = 'Selecione a categoria.';
    if (!editing && (!/^\d+$/.test(form.quantity) || Number(form.quantity) < 0)) errs.quantity = 'Informe um número inteiro maior ou igual a zero.';
    if (!/^\d+$/.test(form.minStock)) errs.minStock = 'Informe um número inteiro maior ou igual a zero.';
    if (form.costPrice === null) errs.costPrice = 'Informe o preço de custo.';
    if (form.salePrice === null) errs.salePrice = 'Informe o preço de venda.';
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      const body = {
        ...form,
        quantity: Number(form.quantity),
        minStock: Number(form.minStock),
        supplierId: form.supplierId ? Number(form.supplierId) : null,
      };
      if (editing) await api.put(`/products/${editing.id}`, body);
      else await api.post('/products', body);
      toast('success', editing ? 'Produto atualizado' : 'Produto cadastrado', form.name);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível salvar', err instanceof ApiError ? (err.fields?.sku ?? err.message) : undefined);
    } finally {
      setSaving(false);
    }
  }

  const categories = settings?.productCategories ?? [];
  const catOptions = form.category && !categories.includes(form.category) ? [form.category, ...categories] : categories;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar produto' : 'Novo produto'}
      subtitle={editing ? `Cadastrado em ${date(editing.createdAt)}` : 'Cadastre um item do seu estoque'}
      icon={<Package className="h-5 w-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Nome do produto" required error={errors.name} className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} autoFocus placeholder="Ex.: Café especial 250g" />
        </FormField>
        <FormField label="Código / SKU" required error={errors.sku}>
          <Input value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} invalid={!!errors.sku} placeholder="Ex.: CAF-010" />
        </FormField>
        <FormField label="Categoria" required error={errors.category}>
          <Select value={form.category} onChange={(e) => set('category', e.target.value)} invalid={!!errors.category}>
            <option value="">Selecione...</option>
            {catOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Preço de custo" required error={errors.costPrice}>
          <MoneyInput value={form.costPrice} onChange={(v) => set('costPrice', v)} invalid={!!errors.costPrice} />
        </FormField>
        <FormField
          label="Preço de venda"
          required
          error={errors.salePrice}
          hint={margin !== null ? <span className={margin < 0 ? 'font-semibold text-neg-600' : ''}>Margem de {margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% sobre a venda</span> : undefined}
        >
          <MoneyInput value={form.salePrice} onChange={(v) => set('salePrice', v)} invalid={!!errors.salePrice} />
        </FormField>
        <FormField
          label={editing ? 'Quantidade disponível' : 'Quantidade inicial'}
          required={!editing}
          error={errors.quantity}
          hint={editing ? 'Altere a quantidade registrando entradas e saídas.' : 'Gera uma movimentação de entrada.'}
        >
          <Input type="number" min={0} step={1} value={form.quantity} disabled={!!editing} onChange={(e) => set('quantity', e.target.value)} invalid={!!errors.quantity} />
        </FormField>
        <FormField label="Estoque mínimo" required error={errors.minStock} hint="Alertamos quando a quantidade chegar a este nível.">
          <Input type="number" min={0} step={1} value={form.minStock} onChange={(e) => set('minStock', e.target.value)} invalid={!!errors.minStock} />
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
        <FormField label="Descrição" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalhes do produto (opcional)" />
        </FormField>
      </form>
    </Modal>
  );
}

/* ----------------------------- Movimentação ----------------------------- */
function MovementModal({ product, type, onClose, onSaved }: { product: Product | null; type: 'ENTRADA' | 'SAIDA'; onClose: () => void; onSaved: () => void }) {
  const { toast, confirm } = useFeedback();
  const [quantity, setQuantity] = useState('1');
  const [unitValue, setUnitValue] = useState<number | null>(null);
  const [mdate, setMdate] = useState(today());
  const [notes, setNotes] = useState('');
  const [createFinancial, setCreateFinancial] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [financialStatus, setFinancialStatus] = useState<'REALIZADO' | 'PENDENTE'>('REALIZADO');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    setQuantity('1');
    setUnitValue(type === 'ENTRADA' ? product.costPrice : product.salePrice);
    setMdate(today());
    setNotes('');
    setCreateFinancial(false);
    setFinancialStatus('REALIZADO');
    setErrors({});
  }, [product, type]);

  if (!product) return null;
  const qty = Number(quantity) || 0;
  const resulting = product.quantity + (type === 'ENTRADA' ? qty : -qty);
  const isIn = type === 'ENTRADA';

  async function send(confirmNegative: boolean): Promise<void> {
    setSaving(true);
    try {
      await api.post(`/products/${product!.id}/movements`, {
        type,
        quantity: qty,
        unitValue,
        date: mdate,
        notes,
        confirmNegative,
        createFinancial,
        paymentMethod,
        financialStatus,
      });
      toast(
        'success',
        isIn ? 'Entrada registrada' : 'Saída registrada',
        `${product!.name}: ${isIn ? '+' : '−'}${qty} un.${createFinancial ? (isIn ? ' · despesa lançada' : ' · receita lançada') : ''}`,
      );
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NEGATIVE_STOCK') {
        setSaving(false);
        const ok = await confirm({
          title: 'Estoque ficará negativo',
          tone: 'warning',
          message: (
            <>
              Há apenas <b>{product!.quantity} un.</b> de <b>{product!.name}</b>. Registrar a saída de <b>{qty} un.</b> deixará o estoque em <b className="text-neg-600">{resulting} un.</b>
              <span className="mt-2 block">Confirme apenas se a mercadoria realmente saiu (ex.: estoque não registrado anteriormente).</span>
            </>
          ),
          confirmLabel: 'Confirmar mesmo assim',
        });
        if (ok) return send(true);
        return;
      }
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível registrar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\d+$/.test(quantity) || qty <= 0) errs.quantity = 'Informe uma quantidade inteira maior que zero.';
    if (!mdate) errs.date = 'Informe a data.';
    if (createFinancial && !unitValue) errs.unitValue = 'Informe o valor unitário para gerar o lançamento.';
    if (Object.keys(errs).length) return setErrors(errs);
    send(false);
  }

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title={isIn ? 'Registrar entrada' : 'Registrar saída'}
      subtitle={`${product.name} · ${product.sku}`}
      icon={isIn ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" loading={saving} variant={isIn ? 'success' : 'primary'}>
            {isIn ? 'Registrar entrada' : 'Registrar saída'}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div>
            <p className="text-[11px] font-semibold text-muted">Atual</p>
            <p className="num text-lg font-extrabold text-ink">{product.quantity}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted">{isIn ? 'Entrada' : 'Saída'}</p>
            <p className={`num text-lg font-extrabold ${isIn ? 'text-pos-600' : 'text-neg-600'}`}>
              {isIn ? '+' : '−'}
              {qty}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted">Resultado</p>
            <p className={`num text-lg font-extrabold ${resulting < 0 ? 'text-neg-600' : resulting <= product.minStock ? 'text-warn-600' : 'text-ink'}`}>{resulting}</p>
          </div>
        </div>
        {resulting < 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-neg-50 p-2.5 text-xs font-semibold text-neg-700">
            <AlertTriangle className="h-4 w-4 shrink-0" /> O estoque ficará negativo. Será pedida uma confirmação.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantidade" required error={errors.quantity}>
            <Input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} invalid={!!errors.quantity} autoFocus />
          </FormField>
          <FormField label="Data" required error={errors.date}>
            <Input type="date" value={mdate} onChange={(e) => setMdate(e.target.value)} invalid={!!errors.date} />
          </FormField>
        </div>
        <FormField label={isIn ? 'Custo unitário' : 'Preço unitário de venda'} error={errors.unitValue} hint={qty > 0 && unitValue ? `Total: ${money(qty * unitValue)}` : undefined}>
          <MoneyInput value={unitValue} onChange={setUnitValue} invalid={!!errors.unitValue} />
        </FormField>
        <FormField label="Observação">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isIn ? 'Ex.: NF 1234' : 'Ex.: Venda balcão'} />
        </FormField>

        <div className="rounded-xl border border-line p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={createFinancial} onChange={(e) => setCreateFinancial(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span className="block text-sm font-semibold text-ink">{isIn ? 'Lançar despesa da compra' : 'Lançar receita da venda'}</span>
              <span className="block text-xs text-muted">Cria automaticamente o lançamento financeiro vinculado a esta movimentação.</span>
            </span>
          </label>
          {createFinancial && (
            <div className="mt-3 grid animate-fade-in grid-cols-2 gap-3">
              <FormField label="Forma de pagamento">
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Situação">
                <Select value={financialStatus} onChange={(e) => setFinancialStatus(e.target.value as 'REALIZADO' | 'PENDENTE')}>
                  <option value="REALIZADO">{isIn ? 'Pago' : 'Recebido'}</option>
                  <option value="PENDENTE">Pendente</option>
                </Select>
              </FormField>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------- Página ------------------------------- */
export default function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const { settings, version } = useSettings();
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState<'produtos' | 'movimentacoes'>('produtos');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(params.get('filtro') === 'baixo');
  const [movProduct, setMovProduct] = useState('');
  const [movType, setMovType] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [moving, setMoving] = useState<{ product: Product; type: 'ENTRADA' | 'SAIDA' } | null>(null);
  const debounced = useDebounced(search);

  useEffect(() => {
    if (params.get('filtro')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useApi<Product[]>(`/products${qs({ v: version })}`);
  const { data, loading, error, reload } = useApi<Product[]>(`/products${qs({ search: debounced, category, filter: lowOnly ? 'baixo' : '', v: version })}`);
  const movements = useApi<StockMovement[]>(tab === 'movimentacoes' ? `/stock-movements${qs({ productId: movProduct, type: movType, v: version })}` : null);

  const reloadAll = () => {
    reload();
    all.reload();
    if (tab === 'movimentacoes') movements.reload();
  };

  const stats = useMemo(() => {
    const list = all.data ?? [];
    return {
      count: list.length,
      units: list.reduce((a, p) => a + Math.max(0, p.quantity), 0),
      cost: list.reduce((a, p) => a + Math.max(0, p.quantity) * p.costPrice, 0),
      sale: list.reduce((a, p) => a + Math.max(0, p.quantity) * p.salePrice, 0),
      low: list.filter((p) => p.lowStock).length,
    };
  }, [all.data]);

  async function remove(p: Product) {
    const ok = await confirm({
      title: 'Excluir produto?',
      message: (
        <>
          <b>{p.name}</b> ({p.sku}) e todo o seu histórico de movimentações serão excluídos permanentemente. Lançamentos financeiros já gerados serão mantidos.
        </>
      ),
      confirmLabel: 'Excluir produto',
    });
    if (!ok) return;
    try {
      await api.del(`/products/${p.id}`);
      toast('success', 'Produto excluído');
      reloadAll();
    } catch (e) {
      toast('error', 'Erro ao excluir', e instanceof ApiError ? e.message : undefined);
    }
  }

  const hasFilters = !!(search || category || lowOnly);

  return (
    <div>
      <PageHeader
        icon={<Boxes className="h-5 w-5" />}
        title="Estoque"
        description="Controle seus produtos, registre entradas e saídas e receba alertas de reposição."
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Novo produto
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos cadastrados" value={number(stats.count)} icon={<Package className="h-[18px] w-[18px]" />} tone="blue" hint={`${number(stats.units)} unidades em estoque`} />
        <StatCard label="Valor em estoque (custo)" value={money(stats.cost)} icon={<Wallet className="h-[18px] w-[18px]" />} tone="navy" hint="Quantidade × preço de custo" />
        <StatCard label="Valor potencial de venda" value={money(stats.sale)} icon={<Tag className="h-[18px] w-[18px]" />} tone="green" hint={`Margem potencial ${money(stats.sale - stats.cost)}`} />
        <StatCard
          label="Estoque baixo"
          value={number(stats.low)}
          icon={<AlertTriangle className="h-[18px] w-[18px]" />}
          tone={stats.low ? 'amber' : 'slate'}
          hint={stats.low ? 'Clique para filtrar' : 'Tudo em dia'}
          onClick={() => {
            setTab('produtos');
            setLowOnly(true);
          }}
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'produtos', label: 'Produtos', count: all.data?.length },
            { value: 'movimentacoes', label: 'Histórico de movimentações' },
          ]}
        />
      </div>

      {tab === 'produtos' ? (
        <div className="card overflow-hidden">
          <FilterBar
            canClear={hasFilters}
            onClear={() => {
              setSearch('');
              setCategory('');
              setLowOnly(false);
            }}
          >
            <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por nome ou SKU..." />
            <FilterSelect value={category} onChange={setCategory} label="Categoria">
              <option value="">Todas as categorias</option>
              {settings?.productCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </FilterSelect>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-slate-600 select-none">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="h-4 w-4 accent-warn-600" />
              Somente estoque baixo
            </label>
          </FilterBar>

          {error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : !data ? (
            <Spinner />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<PackagePlus className="h-6 w-6" />}
              title={hasFilters ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              description={hasFilters ? 'Ajuste os filtros para ver outros produtos.' : 'Cadastre seus produtos para controlar quantidades, custos e reposição.'}
              action={
                !hasFilters && (
                  <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                    Cadastrar produto
                  </Button>
                )
              }
            />
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : ''}>
              <Table>
                <thead>
                  <tr>
                    <Th>Produto</Th>
                    <Th>Categoria</Th>
                    <Th right>Quantidade</Th>
                    <Th right>Custo</Th>
                    <Th right>Venda</Th>
                    <Th right>Valor em estoque</Th>
                    <Th right>Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} className={`transition ${p.quantity < 0 ? 'bg-neg-50/50' : p.lowStock ? 'bg-warn-50/40' : 'hover:bg-slate-50/70'}`}>
                      <Td>
                        <p className="max-w-[260px] truncate font-semibold text-ink" title={p.name}>
                          {p.name}
                        </p>
                        <p className="num max-w-[260px] truncate text-xs text-muted" title={`Cadastrado em ${date(p.createdAt)}`}>
                          {p.sku}
                          {p.supplier ? ` · ${p.supplier.name}` : ''}
                        </p>
                      </Td>
                      <Td>
                        <Badge>{p.category}</Badge>
                      </Td>
                      <Td right>
                        <div className="flex flex-col items-end">
                          <span className={`num text-[15px] font-extrabold ${p.quantity < 0 ? 'text-neg-600' : p.lowStock ? 'text-warn-700' : 'text-ink'}`}>{number(p.quantity)}</span>
                          <span className="text-[11px] text-muted">mín. {p.minStock}</span>
                          {p.lowStock && (
                            <span className="mt-0.5">
                              <StatusBadge status={p.quantity <= 0 ? 'SEM ESTOQUE' : 'BAIXO'} />
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td right className="num whitespace-nowrap text-slate-600">
                        {money(p.costPrice)}
                      </Td>
                      <Td right className="num whitespace-nowrap text-slate-600">
                        {money(p.salePrice)}
                      </Td>
                      <Td right className="num font-bold whitespace-nowrap text-ink">
                        {money(p.stockValue)}
                      </Td>
                      <Td right>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="soft" onClick={() => setMoving({ product: p, type: 'ENTRADA' })} title="Registrar entrada" className="!bg-pos-50 !text-pos-700 hover:!bg-pos-100">
                            <ArrowDownToLine className="h-3.5 w-3.5" /> Entrada
                          </Button>
                          <Button size="sm" variant="soft" onClick={() => setMoving({ product: p, type: 'SAIDA' })} title="Registrar saída">
                            <ArrowUpFromLine className="h-3.5 w-3.5" /> Saída
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Editar"
                            aria-label="Editar"
                            onClick={() => {
                              setEditing(p);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Excluir" aria-label="Excluir" onClick={() => remove(p)} className="hover:bg-neg-50 hover:text-neg-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <FilterBar
            canClear={!!(movProduct || movType)}
            onClear={() => {
              setMovProduct('');
              setMovType('');
            }}
          >
            <FilterSelect value={movProduct} onChange={setMovProduct} label="Produto">
              <option value="">Todos os produtos</option>
              {all.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={movType} onChange={setMovType} label="Tipo">
              <option value="">Entradas e saídas</option>
              <option value="ENTRADA">Somente entradas</option>
              <option value="SAIDA">Somente saídas</option>
            </FilterSelect>
          </FilterBar>
          {movements.error ? (
            <div className="p-5">
              <ErrorState message={movements.error} onRetry={movements.reload} />
            </div>
          ) : !movements.data ? (
            <Spinner />
          ) : movements.data.length === 0 ? (
            <EmptyState icon={<History className="h-6 w-6" />} title="Sem movimentações" description="As entradas e saídas de mercadorias aparecerão aqui." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Produto</Th>
                  <Th>Tipo</Th>
                  <Th right>Quantidade</Th>
                  <Th right>Valor unit.</Th>
                  <Th right>Saldo após</Th>
                  <Th>Observação</Th>
                </tr>
              </thead>
              <tbody>
                {movements.data.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <Td className="num whitespace-nowrap text-slate-600">{date(m.date)}</Td>
                    <Td>
                      <p className="max-w-[240px] truncate font-semibold text-ink">{m.product?.name}</p>
                      <p className="num text-xs text-muted">{m.product?.sku}</p>
                    </Td>
                    <Td>
                      <StatusBadge status={m.type} />
                    </Td>
                    <Td right className={`num font-bold ${m.type === 'ENTRADA' ? 'text-pos-700' : 'text-neg-600'}`}>
                      {m.type === 'ENTRADA' ? '+' : '−'}
                      {m.quantity}
                    </Td>
                    <Td right className="num text-slate-600">
                      {m.unitValue !== null ? money(m.unitValue) : '—'}
                    </Td>
                    <Td right className={`num font-semibold ${m.balanceAfter < 0 ? 'text-neg-600' : 'text-ink'}`}>
                      {m.balanceAfter}
                    </Td>
                    <Td className="text-xs text-slate-600">
                      {m.notes ?? '—'}
                      {(m.revenueId || m.expenseId) && (
                        <span className="ml-1.5">
                          <Badge tone="blue">{m.revenueId ? 'Receita gerada' : 'Despesa gerada'}</Badge>
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={reloadAll} />
      <MovementModal product={moving?.product ?? null} type={moving?.type ?? 'ENTRADA'} onClose={() => setMoving(null)} onSaved={reloadAll} />
    </div>
  );
}
