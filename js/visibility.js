// 보이기·선택 규칙 (three.js와 무관한 순수 함수).
// state = { layers: {[layer]: 'on'|'ghost'|'off'}, hidden: string[], selected: string|null }

export function splitName(name) {
  const m = name.trim().match(/^(.*)\.([a-z]{1,2})$/);
  let base = (m ? m[1] : name).trim();
  if (base.startsWith('(') && base.endsWith(')')) base = base.slice(1, -1).trim();
  return { base, suffix: m ? m[2] : '' };
}

export function isPickable(meshName, index, layerStates, hidden) {
  const info = index[meshName];
  return Boolean(info) && layerStates[info.layer] === 'on' && !hidden.has(meshName);
}

export function applyLayerChange(state, layer, newLayerState, index) {
  const layers = { ...state.layers, [layer]: newLayerState };
  const sel = state.selected;
  const selected = sel && newLayerState === 'off' && index[sel]?.layer === layer ? null : sel;
  return { ...state, layers, selected };
}

export function hideSelected(state) {
  if (!state.selected) return state;
  return { ...state, hidden: [...new Set([...state.hidden, state.selected])], selected: null };
}

export function isolateSelected(state, index) {
  if (!state.selected) return state;
  return { ...state, hidden: Object.keys(index).filter((n) => n !== state.selected) };
}

export function showAll(state) {
  return { ...state, hidden: [] };
}

// 이름 비교용 열쇠: 소문자, 끝의 " muscle" 제거
const key = (base) => base.toLowerCase().replace(/ muscle$/, '');
// "Long head of biceps brachii" → "biceps brachii" (근육 전체)
const wholeOf = (base) => base.match(/^.+? (?:head|part|belly) of (.+)$/i)?.[1];

export function insertionNamesFor(meshName, insertionNames) {
  const { base, suffix: side } = splitName(meshName);
  const wanted = new Set([key(base)]);
  const whole = wholeOf(base);
  if (whole) wanted.add(key(whole));
  const origins = [];
  const insertions = [];
  for (const name of insertionNames) {
    const { base: b, suffix } = splitName(name);
    if (!wanted.has(key(b))) continue;
    const kind = suffix[0];
    const s = suffix.slice(1);
    if (side && s !== side) continue;
    if (kind === 'o') origins.push(name);
    else if (kind === 'e') insertions.push(name);
  }
  return { origins, insertions };
}
