// 층 목록과 상태 전환 (on → ghost → off → on)
export const LAYERS = [
  { id: 'skin', label: '피부' },
  { id: 'muscle', label: '근육' },
  { id: 'bone', label: '뼈' },
  { id: 'organ', label: '장기' },
  { id: 'vessel', label: '혈관' },
  { id: 'nerve', label: '신경' },
];

export const STATE_LABEL = { on: '켬', ghost: '반투명', off: '끔' };

export function initialLayerStates() {
  return { skin: 'off', muscle: 'on', bone: 'on', organ: 'off', vessel: 'off', nerve: 'off' };
}

const NEXT = { on: 'ghost', ghost: 'off', off: 'on' };
export function nextLayerState(current) {
  return NEXT[current] ?? 'on';
}

export function layerEvent(states, layer, event) {
  if (event === 'loadFailed') return { ...states, [layer]: 'off' };
  return { ...states, [layer]: nextLayerState(states[layer]) };
}

export function needsLoad(layer, loaded) {
  return !loaded.has(layer);
}
