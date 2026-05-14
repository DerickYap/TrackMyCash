import { useState } from 'react';
import { AuthProvider, useAuth } from './store/AuthContext';
import { AppProvider } from './store/AppContext';
import { TabBar } from './components/layout/TabBar';
import { TopBar } from './components/layout/TopBar';
import { SettingsPanel } from './components/layout/SettingsPanel';
import { NetworthTab } from './components/networth/NetworthTab';
import { ExpenseTab } from './components/expense/ExpenseTab';
import { ProjectionTab } from './components/projection/ProjectionTab';
import { LoginPage } from './components/auth/LoginPage';
import { MigrationBanner } from './components/auth/MigrationBanner';
import { useFxRate } from './hooks/useFxRate';
import { usePriceRefresh } from './hooks/usePriceRefresh';
import { useSync } from './store/AppContext';

type Tab = 'networth' | 'expenses' | 'projection';

function FullScreenSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-gray-50">
      <span className="text-lg font-semibold text-gray-700">Track My Cash</span>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppInner() {
  const [tab, setTab] = useState<Tab>('networth');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { cloudSyncState, showMigrationBanner } = useSync();

  useFxRate();
  const { isRefreshing, cooldownActive, manualRefresh } = usePriceRefresh();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {cloudSyncState === 'loading' && (
        <div className="fixed top-0 left-0 w-full h-0.5 bg-blue-500 animate-pulse z-50" />
      )}
      {showMigrationBanner && <MigrationBanner />}
      <TopBar
        onSettingsOpen={() => setSettingsOpen(true)}
        onRefresh={manualRefresh}
        isRefreshing={isRefreshing}
        cooldownActive={cooldownActive}
      />
      <TabBar activeTab={tab} onChange={setTab} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'networth' && <NetworthTab />}
        {tab === 'expenses' && <ExpenseTab />}
        {tab === 'projection' && <ProjectionTab />}
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <LoginPage />;
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
