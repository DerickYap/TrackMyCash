import React, { createContext, useContext, useReducer, useEffect, Dispatch } from 'react';
import { networthReducer, NetworthState, NetworthAction } from './networthReducer';
import { expenseReducer, ExpenseState, ExpenseAction } from './expenseReducer';
import { projectionReducer, ProjectionState, ProjectionAction } from './projectionReducer';
import { settingsReducer, SettingsAction, DEFAULT_SETTINGS } from './settingsReducer';
import { AppSettings } from '../types/settings';

const KEYS = {
  entries: 'nw_entries',
  transactions: 'nw_transactions',
  settings: 'nw_settings',
  categoryMemory: 'nw_category_memory',
  scenarios: 'nw_projection_scenarios',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// --- Networth Context ---
interface NetworthContextValue {
  state: NetworthState;
  dispatch: Dispatch<NetworthAction>;
}
export const NetworthContext = createContext<NetworthContextValue>(null!);
export const useNetworth = () => useContext(NetworthContext);

// --- Expense Context ---
interface ExpenseContextValue {
  state: ExpenseState;
  dispatch: Dispatch<ExpenseAction>;
}
export const ExpenseContext = createContext<ExpenseContextValue>(null!);
export const useExpense = () => useContext(ExpenseContext);

// --- Projection Context ---
interface ProjectionContextValue {
  state: ProjectionState;
  dispatch: Dispatch<ProjectionAction>;
}
export const ProjectionContext = createContext<ProjectionContextValue>(null!);
export const useProjection = () => useContext(ProjectionContext);

// --- Settings Context ---
interface SettingsContextValue {
  state: AppSettings;
  dispatch: Dispatch<SettingsAction>;
}
export const SettingsContext = createContext<SettingsContextValue>(null!);
export const useSettings = () => useContext(SettingsContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [networthState, networthDispatch] = useReducer(networthReducer, { entries: [] }, () => ({
    entries: loadFromStorage(KEYS.entries, []),
  }));

  const [expenseState, expenseDispatch] = useReducer(expenseReducer, { transactions: [], categoryMemory: {} }, () => ({
    transactions: loadFromStorage(KEYS.transactions, []),
    categoryMemory: loadFromStorage(KEYS.categoryMemory, {}),
  }));

  const [projectionState, projectionDispatch] = useReducer(projectionReducer, { scenarios: [] }, () => ({
    scenarios: loadFromStorage(KEYS.scenarios, []),
  }));

  const [settingsState, settingsDispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS, () =>
    loadFromStorage<AppSettings>(KEYS.settings, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    localStorage.setItem(KEYS.entries, JSON.stringify(networthState.entries));
  }, [networthState.entries]);

  useEffect(() => {
    localStorage.setItem(KEYS.transactions, JSON.stringify(expenseState.transactions));
    localStorage.setItem(KEYS.categoryMemory, JSON.stringify(expenseState.categoryMemory));
  }, [expenseState.transactions, expenseState.categoryMemory]);

  useEffect(() => {
    localStorage.setItem(KEYS.scenarios, JSON.stringify(projectionState.scenarios));
  }, [projectionState.scenarios]);

  useEffect(() => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settingsState));
  }, [settingsState]);

  return (
    <NetworthContext.Provider value={{ state: networthState, dispatch: networthDispatch }}>
      <ExpenseContext.Provider value={{ state: expenseState, dispatch: expenseDispatch }}>
        <ProjectionContext.Provider value={{ state: projectionState, dispatch: projectionDispatch }}>
          <SettingsContext.Provider value={{ state: settingsState, dispatch: settingsDispatch }}>
            {children}
          </SettingsContext.Provider>
        </ProjectionContext.Provider>
      </ExpenseContext.Provider>
    </NetworthContext.Provider>
  );
}
