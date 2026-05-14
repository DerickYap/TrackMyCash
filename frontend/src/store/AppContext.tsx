import React, { createContext, useContext, useReducer, useEffect, useState, useRef, Dispatch } from 'react';
import { networthReducer, NetworthState, NetworthAction } from './networthReducer';
import { expenseReducer, ExpenseState, ExpenseAction } from './expenseReducer';
import { projectionReducer, ProjectionState, ProjectionAction } from './projectionReducer';
import { settingsReducer, SettingsAction, DEFAULT_SETTINGS } from './settingsReducer';
import { AppSettings } from '../types/settings';
import { useAuth } from './AuthContext';
import { fetchUserData, upsertUserData, UserDataRow } from '../services/cloudStorage';

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

// --- Sync Context ---
interface SyncContextValue {
  cloudSyncState: 'idle' | 'loading' | 'synced' | 'error';
  showMigrationBanner: boolean;
  acceptMigration: () => void;
  dismissMigration: () => void;
}
export const SyncContext = createContext<SyncContextValue>(null!);
export const useSync = () => useContext(SyncContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

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

  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'loading' | 'synced' | 'error'>('idle');
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Load from Supabase on login
  useEffect(() => {
    if (!user) return;
    setCloudSyncState('loading');
    fetchUserData(user.id).then(row => {
      if (row) {
        networthDispatch({ type: 'LOAD', payload: row.entries ?? [] });
        expenseDispatch({ type: 'LOAD', payload: { transactions: row.transactions ?? [], categoryMemory: row.category_memory ?? {} } });
        projectionDispatch({ type: 'LOAD', payload: row.scenarios ?? [] });
        settingsDispatch({ type: 'LOAD', payload: row.settings ?? DEFAULT_SETTINGS });
        localStorage.setItem(KEYS.entries, JSON.stringify(row.entries ?? []));
        localStorage.setItem(KEYS.transactions, JSON.stringify(row.transactions ?? []));
        localStorage.setItem(KEYS.categoryMemory, JSON.stringify(row.category_memory ?? {}));
        localStorage.setItem(KEYS.settings, JSON.stringify(row.settings ?? DEFAULT_SETTINGS));
        localStorage.setItem(KEYS.scenarios, JSON.stringify(row.scenarios ?? []));
      } else {
        const hasLocal =
          (localStorage.getItem(KEYS.entries) ?? '[]') !== '[]' ||
          (localStorage.getItem(KEYS.transactions) ?? '[]') !== '[]';
        if (hasLocal) {
          setShowMigrationBanner(true);
        } else {
          upsertUserData(user.id, {
            entries: [], transactions: [], settings: DEFAULT_SETTINGS,
            category_memory: {}, categories: [], scenarios: [],
          });
        }
      }
      setCloudSyncState('synced');
    }).catch(() => setCloudSyncState('error'));
  }, [user?.id]);

  // Reset all state on logout
  useEffect(() => {
    if (!user && prevUserIdRef.current) {
      networthDispatch({ type: 'LOAD', payload: [] });
      expenseDispatch({ type: 'LOAD', payload: { transactions: [], categoryMemory: {} } });
      projectionDispatch({ type: 'LOAD', payload: [] });
      settingsDispatch({ type: 'LOAD', payload: DEFAULT_SETTINGS });
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      setCloudSyncState('idle');
      setShowMigrationBanner(false);
    }
    prevUserIdRef.current = user?.id;
  }, [user]);

  function debouncedSync(key: string, payload: Partial<Omit<UserDataRow, 'user_id' | 'updated_at'>>, ms = 500) {
    if (!user) return;
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => upsertUserData(user.id, payload), ms);
  }

  function acceptMigration() {
    if (!user) return;
    upsertUserData(user.id, {
      entries: networthState.entries,
      transactions: expenseState.transactions,
      settings: settingsState,
      category_memory: expenseState.categoryMemory,
      categories: [],
      scenarios: projectionState.scenarios,
    });
    setShowMigrationBanner(false);
  }

  function dismissMigration() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    setShowMigrationBanner(false);
  }

  // Persist to localStorage + debounced cloud sync
  useEffect(() => {
    localStorage.setItem(KEYS.entries, JSON.stringify(networthState.entries));
    debouncedSync('entries', { entries: networthState.entries }, 1000);
  }, [networthState.entries]);

  useEffect(() => {
    localStorage.setItem(KEYS.transactions, JSON.stringify(expenseState.transactions));
    localStorage.setItem(KEYS.categoryMemory, JSON.stringify(expenseState.categoryMemory));
    debouncedSync('expense', { transactions: expenseState.transactions, category_memory: expenseState.categoryMemory });
  }, [expenseState.transactions, expenseState.categoryMemory]);

  useEffect(() => {
    localStorage.setItem(KEYS.scenarios, JSON.stringify(projectionState.scenarios));
    debouncedSync('scenarios', { scenarios: projectionState.scenarios });
  }, [projectionState.scenarios]);

  useEffect(() => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settingsState));
    debouncedSync('settings', { settings: settingsState });
  }, [settingsState]);

  return (
    <SyncContext.Provider value={{ cloudSyncState, showMigrationBanner, acceptMigration, dismissMigration }}>
      <NetworthContext.Provider value={{ state: networthState, dispatch: networthDispatch }}>
        <ExpenseContext.Provider value={{ state: expenseState, dispatch: expenseDispatch }}>
          <ProjectionContext.Provider value={{ state: projectionState, dispatch: projectionDispatch }}>
            <SettingsContext.Provider value={{ state: settingsState, dispatch: settingsDispatch }}>
              {children}
            </SettingsContext.Provider>
          </ProjectionContext.Provider>
        </ExpenseContext.Provider>
      </NetworthContext.Provider>
    </SyncContext.Provider>
  );
}
