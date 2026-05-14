type Tab = 'networth' | 'expenses' | 'projection';

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function TabBar({ activeTab, onChange }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'networth', label: 'Net Worth' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'projection', label: 'Projection' },
  ];

  return (
    <div className="flex border-b border-gray-200 bg-white">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === t.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
