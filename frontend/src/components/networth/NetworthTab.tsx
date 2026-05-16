import { useState, useMemo, useCallback } from 'react';
import { useNetworth, useSettings } from '../../store/AppContext';
import { EntryUnion, ManualEntry, HoldingEntry } from '../../types/networth';
import { SummaryStrip } from './SummaryStrip';
import { AllocationChart } from './AllocationChart';
import { CategoryGroup } from './CategoryGroup';
import { AddEntryFAB } from './AddEntryFAB';
import { AddEditEntryModal } from './modals/AddEditEntryModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';

type GroupBy = 'type' | 'account';

const CATEGORY_ORDER = ['bank', 'cpf', 'cpfis', 'retirement', 'stock', 'etf', 'mutualfund', 'crypto', 'metal', 'liability'];

function getTypeKey(entry: EntryUnion): string {
  if (entry.entryType === 'manual') return (entry as ManualEntry).category;
  return (entry as HoldingEntry).assetClass;
}

function getAccountKey(entry: EntryUnion): string {
  const account = entry.entryType === 'manual'
    ? (entry as ManualEntry).account
    : (entry as HoldingEntry).account;
  return account?.trim() || 'No Account';
}

export function NetworthTab() {
  const { state, dispatch } = useNetworth();
  const { state: settings } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryUnion | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('type');

  const { groups, sortedGroups } = useMemo(() => {
    const g: Record<string, EntryUnion[]> = {};
    for (const e of state.entries) {
      const key = groupBy === 'type' ? getTypeKey(e) : getAccountKey(e);
      if (!g[key]) g[key] = [];
      g[key].push(e);
    }
    const sorted = groupBy === 'type'
      ? CATEGORY_ORDER.filter(k => g[k]?.length > 0)
      : Object.keys(g).sort((a, b) => a === 'No Account' ? 1 : b === 'No Account' ? -1 : a.localeCompare(b));
    return { groups: g, sortedGroups: sorted };
  }, [state.entries, groupBy]);

  const handleSave = useCallback((entry: EntryUnion) => {
    if (editEntry) {
      dispatch({ type: 'EDIT_ENTRY', payload: entry });
    } else {
      dispatch({ type: 'ADD_ENTRY', payload: entry });
    }
    setShowModal(false);
    setEditEntry(undefined);
  }, [editEntry, dispatch]);

  const handleEdit = useCallback((entry: EntryUnion) => {
    setEditEntry(entry);
    setShowModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId) dispatch({ type: 'DELETE_ENTRY', payload: deleteId });
    setDeleteId(null);
  }, [deleteId, dispatch]);

  const handleOpenAdd = useCallback(() => { setEditEntry(undefined); setShowModal(true); }, []);
  const handleCancelModal = useCallback(() => { setShowModal(false); setEditEntry(undefined); }, []);
  const handleCancelDelete = useCallback(() => setDeleteId(null), []);

  const deleteEntry = deleteId ? state.entries.find(e => e.id === deleteId) : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <SummaryStrip
        entries={state.entries}
        displayCurrency={settings.displayCurrency}
        fxRate={settings.fxRate}
      />

      <AllocationChart
        entries={state.entries}
        displayCurrency={settings.displayCurrency}
        fxRate={settings.fxRate}
      />

      <div className="p-4 space-y-3">
        {/* Group-by toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Group by:</span>
          <div className="flex bg-gray-100 rounded-md p-0.5">
            {(['type', 'account'] as GroupBy[]).map(g => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                  groupBy === g
                    ? 'bg-white text-blue-600 font-semibold shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {sortedGroups.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No entries yet.</p>
            <p className="text-xs mt-1">Tap + to add your first asset or liability.</p>
          </div>
        )}
        {sortedGroups.map(key => (
          <CategoryGroup
            key={key}
            groupKey={key}
            entries={groups[key]}
            displayCurrency={settings.displayCurrency}
            fxRate={settings.fxRate}
            onEdit={handleEdit}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      <AddEntryFAB onClick={handleOpenAdd} />

      {showModal && (
        <AddEditEntryModal
          initial={editEntry}
          onSave={handleSave}
          onCancel={handleCancelModal}
        />
      )}

      {deleteId && deleteEntry && (
        <DeleteConfirmModal
          name={deleteEntry.entryType === 'manual' ? (deleteEntry as ManualEntry).name : (deleteEntry as HoldingEntry).name || (deleteEntry as HoldingEntry).ticker}
          onConfirm={handleDeleteConfirm}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}
