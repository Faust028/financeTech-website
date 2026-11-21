import { useEffect, useState } from 'react';
import { Building2, Database, FlaskConical, Plus, RotateCcw, Save, Settings as SettingsIcon, Tags, Trash2, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { api, ApiError } from '../lib/api';
import { isEmail, onlyDigits, validateDocument } from '../lib/format';
import type { Settings } from '../lib/types';
import { Button } from '../components/ui/Button';
import { DocumentInput, FormField, Input, MoneyInput, PhoneInput } from '../components/ui/Field';
import { useFeedback } from '../components/ui/Feedback';
import { Card, PageHeader, Spinner } from '../components/ui/misc';

function CategoryEditor({ label, values, onChange, error }: { label: string; values: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase())) return setDraft('');
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-lg border border-line bg-slate-50 py-1 pr-1 pl-2.5 text-[13px] font-medium text-slate-700">
            {v}
            <button
              type="button"
              aria-label={`Remover ${v}`}
              disabled={values.length <= 1}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded p-0.5 text-slate-400 hover:bg-neg-50 hover:text-neg-600 disabled:opacity-30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nova categoria"
          maxLength={60}
        />
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={add} disabled={!draft.trim()}>
          Adicionar
        </Button>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-neg-600">{error}</p>}
      <p className="mt-1 text-xs text-muted">Remover uma categoria não altera lançamentos já existentes.</p>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, bump } = useSettings();
  const { toast, confirm } = useFeedback();
  const [form, setForm] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'demo' | 'clear' | null>(null);

  useEffect(() => {
    if (settings) setForm({ ...settings, document: settings.document ?? '', email: settings.email ?? '', phone: settings.phone ?? '' });
  }, [settings]);

  if (!form) return <Spinner />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = 'Informe o nome da empresa.';
    const de = validateDocument(form.document ?? '');
    if (de) errs.document = de;
    if (form.email && !isEmail(form.email)) errs.email = 'E-mail inválido.';
    const ph = onlyDigits(form.phone ?? '');
    if (ph && ph.length !== 10 && ph.length !== 11) errs.phone = 'Telefone inválido.';
    if (!form.openingDate) errs.openingDate = 'Informe a data.';
    if (!form.dueSoonDays || form.dueSoonDays < 1 || form.dueSoonDays > 60) errs.dueSoonDays = 'Informe entre 1 e 60 dias.';
    if (Object.keys(errs).length) return setErrors(errs);

    setSaving(true);
    try {
      const updated = await api.put<Settings>('/settings', form);
      setSettings(updated);
      bump();
      toast('success', 'Configurações salvas', 'Indicadores recalculados com as novas definições.');
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast('error', 'Não foi possível salvar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function restoreDemo() {
    const ok = await confirm({
      title: 'Restaurar dados demonstrativos?',
      tone: 'warning',
      message: 'Todos os lançamentos, produtos, clientes e fornecedores atuais serão substituídos pelos dados fictícios da empresa "Café Aroma & Grão". Esta ação não pode ser desfeita.',
      confirmLabel: 'Restaurar demonstração',
    });
    if (!ok) return;
    setBusy('demo');
    try {
      setSettings(await api.post<Settings>('/settings/demo'));
      bump();
      toast('success', 'Dados demonstrativos restaurados');
    } catch (err) {
      toast('error', 'Falha ao restaurar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function clearAll() {
    const ok = await confirm({
      title: 'Apagar todos os dados?',
      message: (
        <>
          Receitas, despesas, produtos, movimentações, clientes e fornecedores serão <b>excluídos permanentemente</b>. Use esta opção para começar a usar o FinanceTech com os dados reais do seu negócio.
        </>
      ),
      confirmLabel: 'Apagar tudo',
    });
    if (!ok) return;
    setBusy('clear');
    try {
      setSettings(await api.post<Settings>('/settings/clear'));
      bump();
      toast('success', 'Dados apagados', 'O sistema está pronto para receber os dados reais da sua empresa.');
    } catch (err) {
      toast('error', 'Falha ao apagar', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title="Configurações"
        description="Dados da empresa, saldo inicial do caixa, alertas e categorias usadas nos cadastros."
        actions={
          <Button icon={<Save className="h-4 w-4" />} type="submit" form="settings-form" loading={saving}>
            Salvar configurações
          </Button>
        }
      />

      <form id="settings-form" onSubmit={save} noValidate className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-600" /> Dados da empresa</span>}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <FormField label="Nome da empresa" required error={errors.companyName} className="sm:col-span-2">
                <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} invalid={!!errors.companyName} />
              </FormField>
              <FormField label="CPF/CNPJ" error={errors.document}>
                <DocumentInput value={form.document ?? ''} onChange={(v) => set('document', v)} invalid={!!errors.document} />
              </FormField>
              <FormField label="Telefone" error={errors.phone}>
                <PhoneInput value={form.phone ?? ''} onChange={(v) => set('phone', v)} invalid={!!errors.phone} />
              </FormField>
              <FormField label="E-mail" error={errors.email} className="sm:col-span-2">
                <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} />
              </FormField>
            </div>
          </Card>

          <Card title="Caixa e alertas" subtitle="O saldo inicial é a base para o cálculo do saldo atual e do fluxo de caixa.">
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <FormField label="Saldo inicial do caixa" error={errors.openingBalance} hint="Digite '-' para valor negativo">
                <MoneyInput value={form.openingBalance} onChange={(v) => set('openingBalance', v ?? 0)} allowNegative />
              </FormField>
              <FormField label="Data do saldo inicial" required error={errors.openingDate}>
                <Input type="date" value={form.openingDate} onChange={(e) => set('openingDate', e.target.value)} invalid={!!errors.openingDate} />
              </FormField>
              <FormField label="Alertar vencimentos com" error={errors.dueSoonDays} hint="dias de antecedência">
                <Input type="number" min={1} max={60} value={form.dueSoonDays} onChange={(e) => set('dueSoonDays', Number(e.target.value))} invalid={!!errors.dueSoonDays} />
              </FormField>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Tags className="h-4 w-4 text-brand-600" /> Categorias</span>}>
            <div className="space-y-6 p-5">
              <CategoryEditor label="Categorias de receitas" values={form.revenueCategories} onChange={(v) => set('revenueCategories', v)} error={errors.revenueCategories} />
              <CategoryEditor label="Categorias de despesas" values={form.expenseCategories} onChange={(v) => set('expenseCategories', v)} error={errors.expenseCategories} />
              <CategoryEditor label="Categorias de produtos" values={form.productCategories} onChange={(v) => set('productCategories', v)} error={errors.productCategories} />
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={<span className="flex items-center gap-2"><Database className="h-4 w-4 text-brand-600" /> Dados do sistema</span>}>
            <div className="space-y-4 p-5">
              {settings?.isDemo ? (
                <div className="flex gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-3.5">
                  <FlaskConical className="h-5 w-5 shrink-0 text-warn-600" />
                  <p className="text-[13px] text-warn-700">
                    <b>Você está usando dados fictícios</b> da empresa de demonstração "Café Aroma & Grão". Nomes, documentos e valores não são reais.
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-muted">Os dados exibidos são os cadastrados por você.</p>
              )}
              <div className="rounded-xl border border-line p-4">
                <p className="text-sm font-bold text-ink">Começar com meus dados</p>
                <p className="mt-1 text-xs text-muted">Apaga todos os registros para você cadastrar as informações reais do seu negócio.</p>
                <Button variant="danger" className="mt-3 w-full" icon={<Trash2 className="h-4 w-4" />} onClick={clearAll} loading={busy === 'clear'} disabled={!!busy}>
                  Apagar todos os dados
                </Button>
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="text-sm font-bold text-ink">Dados demonstrativos</p>
                <p className="mt-1 text-xs text-muted">Recarrega 6 meses de dados fictícios coerentes para apresentar o sistema.</p>
                <Button variant="secondary" className="mt-3 w-full" icon={<RotateCcw className="h-4 w-4" />} onClick={restoreDemo} loading={busy === 'demo'} disabled={!!busy}>
                  Restaurar demonstração
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Sobre">
            <div className="space-y-1.5 p-5 text-[13px] text-muted">
              <p>
                <b className="text-ink">FinanceTech</b> · versão 1.0
              </p>
              <p>Dados armazenados localmente em banco SQLite via Prisma, com esquema pronto para PostgreSQL.</p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
