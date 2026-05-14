import { Scenario } from '../types/projection';

export interface ProjectionState {
  scenarios: Scenario[];
}

export type ProjectionAction =
  | { type: 'ADD_SCENARIO'; payload: Scenario }
  | { type: 'EDIT_SCENARIO'; payload: Scenario }
  | { type: 'DELETE_SCENARIO'; payload: string }
  | { type: 'LOAD'; payload: Scenario[] };

export function projectionReducer(state: ProjectionState, action: ProjectionAction): ProjectionState {
  switch (action.type) {
    case 'LOAD':
      return { scenarios: action.payload };
    case 'ADD_SCENARIO':
      return { scenarios: [...state.scenarios, action.payload] };
    case 'EDIT_SCENARIO':
      return {
        scenarios: state.scenarios.map(s => s.id === action.payload.id ? action.payload : s),
      };
    case 'DELETE_SCENARIO':
      return { scenarios: state.scenarios.filter(s => s.id !== action.payload) };
    default:
      return state;
  }
}
