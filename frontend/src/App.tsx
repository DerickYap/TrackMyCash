import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import { TabBar } from './components/layout/TabBar';
import { TopBar } from './components/layout/TopBar';
import { SettingsPanel } from './components/layout/SettingsPanel';
import { NetworthTab } from './components/networth/NetworthTab';
import { ExpenseTab } from './components/expense/ExpenseTab';
import { ProjectionTab } from './components/projection/ProjectionTab';
import { useFxRate } from './hooks/useFxRate';
import { usePriceRefresh } from './hooks/usePriceRefresh';

type Tab = 'networth' | 'expenses' | 'projection';

function AppInner() {
  const [tab, setTab] = useState<Tab>('networth');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useFxRate();
  const { isRefreshing, cooldownActive, manualRefresh } = usePriceRefresh();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
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

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
