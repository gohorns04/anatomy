import { createViewer } from './viewer.js';
import { LAYERS, STATE_LABEL, initialLayerStates, layerEvent, needsLoad } from './layers.js';
import { isPickable, applyLayerChange, hideSelected, isolateSelected, showAll, insertionNamesFor } from './visibility.js';
import { renderInfo, renderEmpty } from './info.js';
import { onceUntilSuccess } from './retry.js';

const $ = (id) => document.getElementById(id);
const sheet = $('sheet');
// 넓은 화면(가로 700px 이상): 모델 왼쪽 3/4, 설명 패널 오른쪽 1/4에 항상 표시
const wide = window.matchMedia('(min-width: 700px)');
const loadingBar = $('loading-bar');

let index = {};
let content = {};
let state = { layers: initialLayerStates(), hidden: [], selected: null };
const loaded = new Set();
const loading = new Set();
let insertionNames = [];
let loadInsertions = null;
let viewer;

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3200);
}

function renderLayerButtons() {
  for (const btn of document.querySelectorAll('[data-layer]')) {
    const id = btn.dataset.layer;
    const s = state.layers[id];
    btn.dataset.state = loading.has(id) ? 'loading' : s;
    const label = LAYERS.find((l) => l.id === id).label;
    btn.setAttribute('aria-label', `${label}: ${loading.has(id) ? '불러오는 중' : STATE_LABEL[s]}`);
  }
}

async function updateInsertions() {
  const sel = state.selected;
  if (!sel || index[sel]?.layer !== 'muscle') {
    viewer.showInsertions();
    return;
  }
  try {
    insertionNames = await loadInsertions();
  } catch (err) {
    console.error('insertions failed', err); // 다음 근육 선택 때 다시 시도한다
    return;
  }
  if (state.selected === sel) viewer.showInsertions(insertionNamesFor(sel, insertionNames));
}

function render() {
  renderLayerButtons();
  viewer.setHidden(state.hidden);
  viewer.setSelected(state.selected);
  $('show-all').hidden = state.hidden.length === 0;

  const selectedNow = Boolean(state.selected);
  const open = selectedNow || wide.matches;
  if (selectedNow) $('sheet-body').innerHTML = renderInfo(state.selected, index, content);
  else if (wide.matches) $('sheet-body').innerHTML = renderEmpty();
  sheet.classList.toggle('open', open);
  sheet.classList.toggle('has-selection', selectedNow);
  sheet.setAttribute('aria-hidden', String(!open));
  sheet.inert = !open;
  document.body.classList.toggle('sheet-open', selectedNow);
  sheet.scrollTop = 0;
  updateInsertions();
}

async function onLayerTap(layer) {
  if (loading.has(layer)) return;
  const next = layerEvent(state.layers, layer, 'tap')[layer];
  if (next !== 'off' && needsLoad(layer, loaded)) {
    loading.add(layer);
    renderLayerButtons();
    try {
      await viewer.loadLayer(layer);
      loaded.add(layer);
    } catch (err) {
      console.error(`layer ${layer} failed`, err);
      loading.delete(layer);
      state = applyLayerChange(state, layer, layerEvent(state.layers, layer, 'loadFailed')[layer], index);
      viewer.setLayerState(layer, 'off');
      render();
      toast(`${LAYERS.find((l) => l.id === layer).label} 층을 불러오지 못했어요. 다시 눌러 보세요.`);
      return;
    }
    loading.delete(layer);
  }
  state = applyLayerChange(state, layer, next, index);
  viewer.setLayerState(layer, next);
  render();
}

function bindUi() {
  for (const btn of document.querySelectorAll('[data-layer]')) {
    btn.addEventListener('click', () => onLayerTap(btn.dataset.layer));
  }
  $('sheet-close').addEventListener('click', () => { state = { ...state, selected: null }; render(); });
  $('act-focus').addEventListener('click', () => { if (state.selected) viewer.focusOn(state.selected); });
  $('act-hide').addEventListener('click', () => { state = hideSelected(state); render(); });
  $('act-isolate').addEventListener('click', () => { state = isolateSelected(state, index); render(); });
  $('show-all').addEventListener('click', () => { state = showAll(state); render(); });
  $('info-open').addEventListener('click', () => $('about').showModal());
  wide.addEventListener('change', render);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selected) { state = { ...state, selected: null }; render(); }
  });
}

function showError(err) {
  console.error(err);
  $('loading').hidden = true;
  document.body.classList.add('error');
  $('load-error').hidden = false;
}

async function start() {
  window.__appStarted = true;
  viewer = createViewer($('view'), {
    index,
    isPickable: (name, layers, hidden) => isPickable(name, index, layers, hidden),
    onPick: (name) => { state = { ...state, selected: name }; render(); },
  });
  loadInsertions = onceUntilSuccess(() => viewer.loadInsertions());
  for (const l of LAYERS) viewer.setLayerState(l.id, state.layers[l.id]);
  renderLayerButtons();

  const progress = { muscle: [0, 1], bone: [0, 1] };
  const onProgress = (layer) => (got, total) => {
    progress[layer] = [got, total || got || 1];
    const sum = Object.values(progress).reduce((a, [g, t]) => [a[0] + g, a[1] + t], [0, 0]);
    loadingBar.style.width = `${Math.min(100, (sum[0] / sum[1]) * 100).toFixed(0)}%`;
  };

  try {
    const [ix, ct] = await Promise.all([
      fetch('model/index.json').then((r) => { if (!r.ok) throw new Error(`index ${r.status}`); return r.json(); }),
      fetch('data/content.json').then((r) => { if (!r.ok) throw new Error(`content ${r.status}`); return r.json(); }),
      ...['muscle', 'bone'].map((l) => viewer.loadLayer(l, onProgress(l)).then(() => loaded.add(l))),
    ]);
    Object.assign(index, ix);
    content = ct;
  } catch (err) {
    showError(err);
    return;
  }
  $('loading').hidden = true;
  bindUi();
  render();
}

start();
