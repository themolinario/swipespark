import { useCallback, useReducer } from 'react';

type State = {
  isSelectMode: boolean;
  selectedIds: Set<string>;
};

type Action =
  | { type: 'TOGGLE_MODE' }
  | { type: 'SET_MODE'; payload: boolean }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'SET_SELECTED_IDS'; payload: Set<string> | ((prev: Set<string>) => Set<string>) };

function selectionReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_MODE':
      return { ...state, isSelectMode: !state.isSelectMode, selectedIds: new Set<string>() };
    case 'SET_MODE':
      return { ...state, isSelectMode: action.payload, selectedIds: action.payload ? state.selectedIds : new Set<string>() };
    case 'TOGGLE_SELECT': {
      const newSet = new Set<string>(state.selectedIds);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, selectedIds: newSet };
    }
    case 'SELECT_ALL': {
      if (state.selectedIds.size === action.payload.length) {
        return { ...state, selectedIds: new Set<string>() };
      }
      return { ...state, selectedIds: new Set<string>(action.payload) };
    }
    case 'SET_SELECTED_IDS': {
      const newSelectedIds = typeof action.payload === 'function' ? action.payload(state.selectedIds) : action.payload;
      return { ...state, selectedIds: newSelectedIds };
    }
    default:
      return state;
  }
}

export function usePhotoSelection() {
  const [state, dispatch] = useReducer(selectionReducer, {
    isSelectMode: false,
    selectedIds: new Set<string>(),
  });

  const handleToggleSelect = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SELECT', payload: id });
  }, []);

  const toggleSelectMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_MODE' });
  }, []);

  const handleSelectAll = useCallback((itemIds: string[]) => {
    dispatch({ type: 'SELECT_ALL', payload: itemIds });
  }, []);
  
  const setIsSelectMode = useCallback((active: boolean) => {
    dispatch({ type: 'SET_MODE', payload: active });
  }, []);
  
  const setSelectedIds = useCallback((payload: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    dispatch({ type: 'SET_SELECTED_IDS', payload });
  }, []);

  return {
    isSelectMode: state.isSelectMode,
    setIsSelectMode,
    selectedIds: state.selectedIds,
    setSelectedIds,
    handleToggleSelect,
    toggleSelectMode,
    handleSelectAll,
  };
}
