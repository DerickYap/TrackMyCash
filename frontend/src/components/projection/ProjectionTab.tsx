import { useState, useMemo } from 'react';
import { useProjection as useProjectionContext, useNetworth, useSettings } from '../../store/AppContext';
import { Scenario } from '../../types/projection';
import { DEFAULT_RETURN_RATES } from '../../constants/defaultReturnRates';
import { getEntryValue } from '../networth/SummaryStrip';
import { ManualEntry } from '../../types/networth';
import { useProjectionCalc } from '../../hooks/useProjection';
import { ProjectionChart } from './ProjectionChart';
import { ReturnAssumptionsPanel } from './ReturnAssumptionsPanel';
import { ScenarioControls } from './ScenarioControls';
import { SummaryCard } from './SummaryCard';

function buildDefaultScenario(currentNW: number, settings: { monthlyIncome: number | null; returnAssumptions: typeof DEFAULT_RETURN_RATES }): Scenario {
  return {
    id: crypto.randomUUID(),
    name: 'Base Case',
    monthlyIncome: settings.monthlyIncome ?? 0,
    monthlySurplus: 0,
    targetNetworth: currentNW * 2,
    targetDate: null,
    returnAssumptions: settings.returnAssumptions,
  };
}

function ScenarioPanel({ scenario, currentNW, entries, displayCurrency, onChange }: {
  scenario: Scenario;
  currentNW: number;
  entries: ReturnType<typeof useNetworth>['state']['entries'];
  displayCurrency: 'SGD' | 'USD';
  onChange: (s: Scenario) => void;
}) {
  const result = useProjectionCalc(scenario, entries, currentNW);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="block text-xs text-gray-400 mb-1">Current Net Worth</label>
          <div className="text-sm font-semibold text-gray-700">
            {displayCurrency === 'SGD' ? 'S$' : 'US$'}{currentNW.toLocaleString()}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monthly Surplus</label>
          <input type="number" step="100"
            value={scenario.monthlySurplus}
            onChange={e => onChange({ ...scenario, monthlySurplus: parseFloat(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target Net Worth</label>
          <input type="number" step="10000"
            value={scenario.targetNetworth}
            onChange={e => onChange({ ...scenario, targetNetworth: parseFloat(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target Date (optional)</label>
          <input type="date"
            value={scenario.targetDate ?? ''}
            onChange={e => onChange({ ...scenario, targetDate: e.target.value || null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <ReturnAssumptionsPanel
        assumptions={scenario.returnAssumptions}
        onChange={ra => onChange({ ...scenario, returnAssumptions: ra })}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ProjectionChart
          scenarios={[{ name: scenario.name, points: result.points }]}
          targetNetworth={scenario.targetNetworth}
          displayCurrency={displayCurrency}
        />
      </div>

      <SummaryCard
        targetReachedMonth={result.targetReachedMonth}
        requiredSurplus={result.requiredSurplus}
        monthlyIncome={scenario.monthlyIncome}
        displayCurrency={displayCurrency}
      />
    </>
  );
}

export function ProjectionTab() {
  const { state: projState, dispatch: projDispatch } = useProjectionContext();
  const { state: networthState } = useNetworth();
  const { state: settings } = useSettings();

  const currentNW = useMemo(() => {
    let assets = 0, liabilities = 0;
    for (const e of networthState.entries) {
      const v = getEntryValue(e, settings.displayCurrency, settings.fxRate);
      if (e.entryType === 'manual' && (e as ManualEntry).category === 'liability') liabilities += v;
      else assets += v;
    }
    return assets - liabilities;
  }, [networthState.entries, settings.displayCurrency, settings.fxRate]);

  // Ensure at least 1 scenario
  const scenarios = useMemo(() => {
    if (projState.scenarios.length > 0) return projState.scenarios;
    return [buildDefaultScenario(currentNW, settings)];
  }, [projState.scenarios, currentNW, settings]);

  const [activeId, setActiveId] = useState<string>(() => scenarios[0]?.id ?? '');
  const activeScenario = scenarios.find(s => s.id === activeId) ?? scenarios[0];

  function updateScenario(s: Scenario) {
    if (projState.scenarios.length === 0) {
      projDispatch({ type: 'ADD_SCENARIO', payload: s });
    } else {
      projDispatch({ type: 'EDIT_SCENARIO', payload: s });
    }
  }

  function addScenario() {
    if (scenarios.length >= 3) return;
    const newS: Scenario = {
      ...activeScenario,
      id: crypto.randomUUID(),
      name: `Scenario ${scenarios.length + 1}`,
    };
    projDispatch({ type: 'ADD_SCENARIO', payload: newS });
    setActiveId(newS.id);
  }

  function deleteScenario(id: string) {
    projDispatch({ type: 'DELETE_SCENARIO', payload: id });
    if (activeId === id) setActiveId(scenarios.find(s => s.id !== id)?.id ?? '');
  }

  function renameScenario(id: string, name: string) {
    const s = scenarios.find(sc => sc.id === id);
    if (s) updateScenario({ ...s, name });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ScenarioControls
        scenarios={scenarios}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={addScenario}
        onDelete={deleteScenario}
        onRename={renameScenario}
      />

      {activeScenario && (
        <ScenarioPanel
          scenario={activeScenario}
          currentNW={currentNW}
          entries={networthState.entries}
          displayCurrency={settings.displayCurrency}
          onChange={updateScenario}
        />
      )}
    </div>
  );
}
