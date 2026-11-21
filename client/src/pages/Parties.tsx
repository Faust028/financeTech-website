import { useEffect, useState } from 'react';
import { Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck, Users } from 'lucide-react';
import { useApi, useDebounced } from '../hooks/useApi';
import { useSettings } from '../hooks/useSettings';
import { api, ApiError, qs } from '../lib/api';
import { initials, isEmail, maskDocument, maskPhone, onlyDigits, validateDocument } from '../lib/format';
import type { Party } from '../lib/types';
import { Button } from '../components/ui/Button';
import { DocumentInput, FormField, Input, PhoneInput, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useFeedback } from '../components/ui/Feedback';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, Table, Td, Th } from '../components/ui/misc';
import { FilterBar, SearchInput } from '../components/FilterBar';

interface Config {
  endpoint: '/clients' | '/suppliers';
  singular: string;
  plural: string;
  article: 'o' | 'a';
  icon: typeof Users;
  description: string;
  linkedLabel: string;
  deleteNote: string;
}

const emptyForm = { name: '', document: '', phone: '', email: '', address: '' };

function PartyForm({ cfg, open, onClose, editing, onSaved }: { cfg: Config; open: boolean; onClose: () => void; editing: Party | null; onSaved: () => void }) {
  const { toast } = useFeedback();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? { name: editing.name, document: editing.document ?? '', phone: editing.phone ?? '', email: editing.email ?? '', address: editing.address ?? '' }
        : emptyForm,
    );
  }, [open, editing]);

  const set = (k: keyof typeof emptyForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Informe o nome ou razão social.';
    const docErr = validateDocument(form.document);
    if (docErr) errs.document = docErr;
    const ph = onlyDigits(form.phone);
    if (ph && ph.length !== 10 && ph.length !== 11) errs.phone = 'Telefone inválido. Use DDD + número.';
    if (form.email && !isEmail(form.email)) errs.email = 'E-mail inválido.';
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      if (editing) await api.put(`${cfg.endpoint}/${editing.id}`, form);
      else await api.post(cfg.endpoint, form);
      toast('success', `${cfg.singular} ${editing ? 'atualizad' : 'cadastrad'}${cfg.article}`, form.name);
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível salvar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar ${cfg.singular.toLowerCase()}` : `Nov${cfg.article} ${cfg.singular.toLowerCase()}`}
      subtitle="Apenas o nome é obrigatório"
      icon={<cfg.icon className="h-5 w-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="party-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form id="party-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Nome ou razão social" required error={errors.name} className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} autoFocus placeholder="Ex.: Maria Silva ou Empresa Ltda" />
        </FormField>
        <FormField label="CPF/CNPJ" error={errors.document} hint="Validamos os dígitos verificadores">
          <DocumentInput value={form.document} onChange={(v) => set('document', v)} invalid={!!errors.document} />
        </FormField>
        <FormField label="Telefone" error={errors.phone}>
          <PhoneInput value={form.phone} onChange={(v) => set('phone', v)} invalid={!!errors.phone} />
        </FormField>
        <FormField label="E-mail" error={errors.email} className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="nome@empresa.com.br" />
        </FormField>
        <FormField label="Endereço" error={errors.address} className="sm:col-span-2">
          <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
        </FormField>
      </form>
    </Modal>
  );
}

function PartiesPage({ cfg }: { cfg: Config }) {
  const { version } = useSettings();
  const { toast, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const { data, loading, error, reload } = useApi<Party[]>(`${cfg.endpoint}${qs({ search: debounced, v: version })}`);

  async function remove(p: Party) {
    const ok = await confirm({
      title: `Excluir ${cfg.singular.toLowerCase()}?`,
      message: (
        <>
          <b>{p.name}</b> será excluíd{cfg.article} permanentemente.
          {p.linkedCount ? (
            <span className="mt-2 block rounded-lg bg-warn-50 p-2 text-warn-700">
              Há {p.linkedCount} registro(s) vinculado(s). {cfg.deleteNote}
            </span>
          ) : null}
        </>
      ),
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.del(`${cfg.endpoint}/${p.id}`);
      toast('success', `${cfg.singular} excluíd${cfg.article}`);
      reload();
    } catch (e) {
      toast('error', 'Erro ao excluir', e instanceof ApiError ? e.message : undefined);
    }
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        icon={<cfg.icon className="h-5 w-5" />}
        title={cfg.plural}
        description={cfg.description}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>
            Nov{cfg.article} {cfg.singular.toLowerCase()}
          </Button>
        }
      />
      <div className="card overflow-hidden">
        <FilterBar onClear={() => setSearch('')} canClear={!!search}>
          <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar por nome, documento, e-mail ou telefone..." />
          <span className="text-xs text-muted lg:ml-2">{data ? `${data.length} registro(s)` : ''}</span>
        </FilterBar>
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<cfg.icon className="h-6 w-6" />}
            title={search ? 'Nenhum resultado' : `Nenhum${cfg.article === 'a' ? 'a' : ''} ${cfg.singular.toLowerCase()} cadastrad${cfg.article}`}
            description={search ? 'Tente pesquisar por outro termo.' : `Cadastre ${cfg.plural.toLowerCase()} para vinculá-los aos lançamentos.`}
            action={
              !search && (
                <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>
                  Cadastrar
                </Button>
              )
            }
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table>
              <thead>
                <tr>
                  <Th>Nome / Razão social</Th>
                  <Th>CPF/CNPJ</Th>
                  <Th>Contato</Th>
                  <Th>Endereço</Th>
                  <Th>{cfg.linkedLabel}</Th>
                  <Th right>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/70">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{initials(p.name) || '?'}</span>
                        <span className="max-w-[240px] truncate font-semibold text-ink" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                    </Td>
                    <Td className="num whitespace-nowrap text-slate-600">
                      {p.document ? (
                        <span>
                          {maskDocument(p.document)} <span className="ml-1 text-[10px] font-bold text-slate-400">{p.document.length === 11 ? 'CPF' : 'CNPJ'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="space-y-0.5 text-xs text-slate-600">
                        {p.phone && (
                          <p className="num flex items-center gap-1.5 whitespace-nowrap">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {maskPhone(p.phone)}
                          </p>
                        )}
                        {p.email && (
                          <p className="flex max-w-[220px] items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                            {p.email}
                          </p>
                        )}
                        {!p.phone && !p.email && <span className="text-slate-300">—</span>}
                      </div>
                    </Td>
                    <Td>
                      {p.address ? (
                        <p className="flex max-w-[260px] items-start gap-1.5 text-xs text-slate-600">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{p.address}</span>
                        </p>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </Td>
                    <Td>{p.linkedCount ? <Badge tone="blue">{p.linkedCount}</Badge> : <span className="text-xs text-slate-400">Nenhum</span>}</Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
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
      <PartyForm cfg={cfg} open={formOpen} onClose={() => setFormOpen(false)} editing={editing} onSaved={reload} />
    </div>
  );
}

export function ClientsPage() {
  return (
    <PartiesPage
      cfg={{
        endpoint: '/clients',
        singular: 'Cliente',
        plural: 'Clientes',
        article: 'o',
        icon: Users,
        description: 'Cadastre seus clientes e vincule-os às receitas para saber quem mais compra do seu negócio.',
        linkedLabel: 'Receitas',
        deleteNote: 'As receitas serão mantidas, apenas sem cliente vinculado.',
      }}
    />
  );
}

export function SuppliersPage() {
  return (
    <PartiesPage
      cfg={{
        endpoint: '/suppliers',
        singular: 'Fornecedor',
        plural: 'Fornecedores',
        article: 'o',
        icon: Truck,
        description: 'Cadastre seus fornecedores e vincule-os às despesas e aos produtos do estoque.',
        linkedLabel: 'Despesas/Produtos',
        deleteNote: 'Despesas e produtos serão mantidos, apenas sem fornecedor vinculado.',
      }}
    />
  );
}
