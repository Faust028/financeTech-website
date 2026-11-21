import { Link, Route, Routes } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { EmptyState } from './components/ui/misc';
import { Button } from './components/ui/Button';
import DashboardPage from './pages/Dashboard';
import RevenuesPage from './pages/Revenues';
import ExpensesPage from './pages/Expenses';
import CashFlowPage from './pages/CashFlow';
import InventoryPage from './pages/Inventory';
import ReportsPage from './pages/Reports';
import { ClientsPage, SuppliersPage } from './pages/Parties';
import SettingsPage from './pages/Settings';
import InsightsPage from './pages/Insights';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="receitas" element={<RevenuesPage />} />
        <Route path="despesas" element={<ExpensesPage />} />
        <Route path="fluxo-de-caixa" element={<CashFlowPage />} />
        <Route path="estoque" element={<InventoryPage />} />
        <Route path="relatorios" element={<ReportsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="fornecedores" element={<SuppliersPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route
          path="*"
          element={
            <div className="card">
              <EmptyState
                icon={<Compass className="h-6 w-6" />}
                title="Página não encontrada"
                description="O endereço acessado não existe. Use o menu lateral para navegar."
                action={
                  <Link to="/">
                    <Button>Ir para o Dashboard</Button>
                  </Link>
                }
              />
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
