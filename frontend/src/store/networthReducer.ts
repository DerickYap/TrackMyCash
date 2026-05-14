import { EntryUnion, PriceUpdate } from '../types/networth';

export interface NetworthState {
  entries: EntryUnion[];
}

export type NetworthAction =
  | { type: 'ADD_ENTRY'; payload: EntryUnion }
  | { type: 'EDIT_ENTRY'; payload: EntryUnion }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'UPDATE_PRICES'; payload: PriceUpdate[] }
  | { type: 'LOAD'; payload: EntryUnion[] };

export function networthReducer(state: NetworthState, action: NetworthAction): NetworthState {
  switch (action.type) {
    case 'LOAD':
      return { entries: action.payload };
    case 'ADD_ENTRY':
      return { entries: [...state.entries, action.payload] };
    case 'EDIT_ENTRY':
      return {
        entries: state.entries.map(e => e.id === action.payload.id ? action.payload : e),
      };
    case 'DELETE_ENTRY':
      return { entries: state.entries.filter(e => e.id !== action.payload) };
    case 'UPDATE_PRICES':
      return {
        entries: state.entries.map(entry => {
          if (entry.entryType !== 'holding') return entry;
          const update = action.payload.find(u => u.id === entry.id);
          if (!update) return entry;
          return { ...entry, lastPrice: update.lastPrice, lastFetchedAt: update.lastFetchedAt };
        }),
      };
    default:
      return state;
  }
}
