import { Scenario } from '../../types/projection';

interface Props {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ScenarioControls({ scenarios, activeId, onSelect, onAdd, onDelete, onRename }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {scenarios.map((s, i) => (
        <div key={s.id} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm border cursor-pointer transition-colors ${
          s.id === activeId
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
        }`} onClick={() => onSelect(s.id)}>
          <input
            type="text"
            value={s.name}
            onClick={e => e.stopPropagation()}
            onChange={e => onRename(s.id, e.target.value)}
            className={`bg-transparent text-sm w-24 focus:outline-none ${s.id === activeId ? 'text-white placeholder-blue-200' : 'text-gray-700'}`}
          />
          {i > 0 && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(s.id); }}
              className={`ml-1 hover:opacity-70 ${s.id === activeId ? 'text-white' : 'text-gray-400'}`}
            >×</button>
          )}
        </div>
      ))}
      {scenarios.length < 3 && (
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm border border-dashed border-gray-300 text-gray-500 rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add Scenario
        </button>
      )}
    </div>
  );
}
