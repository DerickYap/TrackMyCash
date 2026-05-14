import { Transaction } from '../types/expense';

export interface ExpenseState {
  transactions: Transaction[];
  categoryMemory: Record<string, string>; // "source:description" -> category
}

export type ExpenseAction =
  | { type: 'IMPORT_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'EDIT_CATEGORY'; payload: { id: string; category: string } }
  | { type: 'SET_CATEGORY_MEMORY'; payload: { key: string; category: string } }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'LOAD'; payload: { transactions: Transaction[]; categoryMemory: Record<string, string> } };

export function expenseReducer(state: ExpenseState, action: ExpenseAction): ExpenseState {
  switch (action.type) {
    case 'LOAD':
      return { transactions: action.payload.transactions, categoryMemory: action.payload.categoryMemory };
    case 'IMPORT_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.payload] };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'EDIT_CATEGORY':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? { ...t, category: action.payload.category } : t
        ),
      };
    case 'SET_CATEGORY_MEMORY':
      return {
        ...state,
        categoryMemory: { ...state.categoryMemory, [action.payload.key]: action.payload.category },
      };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
}
