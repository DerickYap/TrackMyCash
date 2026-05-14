import { useSync } from '../../store/AppContext';

export function MigrationBanner() {
  const { acceptMigration, dismissMigration } = useSync();

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800">
        You have existing local data. Import it to your account?
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={acceptMigration}
          className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
        >
          Import
        </button>
        <button
          onClick={dismissMigration}
          className="px-3 py-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors"
        >
          Discard local data
        </button>
      </div>
    </div>
  );
}
