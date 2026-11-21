import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Settings as SettingsIcon,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { useSettings } from '../../hooks/useSettings';
import { initials } from '../../lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/receitas', label: 'Receitas', icon: ArrowUpCircle },
  { to: '/despesas', label: 'Despesas', icon: ArrowDownCircle },
  { to: '/fluxo-de-caixa', label: 'Fluxo de Caixa', icon: ArrowLeftRight },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/fornecedores', label: 'Fornecedores', icon: Truck },
  { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon },
];

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/receitas': 'Receitas',
  '/despesas': 'Despesas',
  '/fluxo-de-caixa': 'Fluxo de Caixa',
  '/estoque': 'Estoque',
  '/relatorios': 'Relatórios',
  '/clientes': 'Clientes',
  '/fornecedores': 'Fornecedores',
  '/configuracoes': 'Configurações',
  '/insights': 'FinanceTech Insights',
};

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { settings } = useSettings();
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition ${
      isActive ? 'bg-white/[0.09] text-white' : 'text-blue-100/60 hover:bg-white/[0.05] hover:text-white'
    }`;
  return (
    <div className="flex h-full flex-col bg-navy-900 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(37,99,235,0.28),transparent_60%)]">
      <div className="px-5 pt-6 pb-7">
        <Logo />
      </div>
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] text-blue-200/35 uppercase">Menu</p>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkCls} onClick={onNavigate}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-brand-500" />}
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-500' : ''}`} strokeWidth={2.2} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <NavLink
          to="/insights"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mt-5 flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
              isActive ? 'border-brand-500/60 bg-brand-600/25' : 'border-white/10 bg-white/[0.04] hover:border-brand-500/40 hover:bg-brand-600/15'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-pos-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-bold text-white">FinanceTech Insights</span>
            <span className="block text-[11px] text-blue-100/55">Análises automáticas</span>
          </span>
        </NavLink>
      </nav>

      <div className="m-3 flex items-center gap-3 rounded-xl bg-white/[0.05] p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          {initials(settings?.companyName ?? 'ME') || 'ME'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">{settings?.companyName ?? '—'}</p>
          <p className="text-[11px] text-blue-100/50">Plano Empreendedor</p>
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = `${TITLES[pathname] ?? 'FinanceTech'} · FinanceTech`;
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-slide-up shadow-pop">
            <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="absolute top-5 right-3 z-10 rounded-lg p-1.5 text-blue-100/70 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-white lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-500">
                <span className="hidden sm:inline">{settings?.companyName} · </span>
                <span className="text-ink">{TITLES[pathname] ?? 'FinanceTech'}</span>
              </p>
            </div>
            {settings?.isDemo && (
              <button
                onClick={() => navigate('/configuracoes')}
                title="Os dados exibidos são fictícios. Gerencie em Configurações."
                className="flex items-center gap-1.5 rounded-full border border-warn-600/25 bg-warn-50 px-3 py-1 text-xs font-bold text-warn-700 transition hover:bg-warn-100"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dados fictícios de demonstração</span>
                <span className="sm:hidden">Demo</span>
              </button>
            )}
            <span className="hidden text-xs font-medium text-muted md:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={pathname} className="animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
