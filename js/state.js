export function initialState() {
  return { system: 'muscle', side: 'front', selectedId: null };
}

export function nextState(state, action) {
  switch (action.type) {
    case 'setSystem':
      return action.system === state.system ? state : { ...state, system: action.system, selectedId: null };
    case 'setSide':
      return action.side === state.side ? state : { ...state, side: action.side, selectedId: null };
    case 'select':
      return { ...state, selectedId: action.id };
    case 'close':
      return { ...state, selectedId: null };
    default:
      return state;
  }
}

export function resolveTap(target) {
  return target?.closest?.('.part')?.dataset.partId ?? null;
}
