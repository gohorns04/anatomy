import { createViewer } from './viewer.js';
import { LAYERS, STATE_LABEL, initialLayerStates, layerEvent, needsLoad } from './layers.js';
import { isPickable, applyLayerChange, hideSelected, isolateSelected, showAll, insertionNamesFor, layersToGhost } from './visibility.js';
import { renderInfo, renderEmpty, renderRelated, escapeHtml } from './info.js';
import { onceUntilSuccess } from './retry.js';
import { contentFor } from './content.js';
import { visibleForSex, resolveTarget, skinAllowed } from './sex.js';
import { search } from './search.js';
import { relatedFor } from './related.js';
import { placeLabels } from './labels.js';
import { REGION_PRESETS } from './regions.js';

const $ = (id) => document.getElementById(id);
const sheet = $('sheet');
// 넓은 화면(가로 700px 이상): 모델 왼쪽 3/4, 설명 패널 오른쪽 1/4에 항상 표시
const wide = window.matchMedia('(min-width: 700px)');
const loadingBar = $('loading-bar');

let index = {};
let content = {};
let state = { layers: initialLayerStates(), hidden: [], selected: null };
let sex = 'male';
let labelsOn = false;
let labelNames = []; // 한국어 내용이 있는 메시들

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
    const unavailable = id === 'skin' && !skinAllowed(sex);
    btn.dataset.state = loading.has(id) ? 'loading' : s;
    btn.classList.toggle('unavailable', unavailable);
    const label = LAYERS.find((l) => l.id === id).label;
    btn.setAttribute('aria-label', unavailable ? `${label}: 여성 모드에서는 지원하지 않아요` : `${label}: ${loading.has(id) ? '불러오는 중' : STATE_LABEL[s]}`);
  }
  for (const btn of document.querySelectorAll('[data-sex]')) btn.setAttribute('aria-pressed', String(btn.dataset.sex === sex));
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
  if (selectedNow) $('info-top').innerHTML = renderInfo(state.selected, index, content);
  else if (wide.matches) $('info-top').innerHTML = renderEmpty();
  $('info-related').innerHTML = renderRelated(selectedNow ? relatedFor(state.selected, index, content) : []);
  $('info-top').scrollTop = 0;
  $('info-related').scrollTop = 0;
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
  if (layer === 'skin' && !skinAllowed(sex)) {
    toast('여성 모드에서는 피부층을 지원하지 않아요.');
    return;
  }
  await setLayer(layer, layerEvent(state.layers, layer, 'tap')[layer]);
}

// 층을 원하는 상태로 바꾼다(필요하면 먼저 불러온다). 실패하면 false.
async function setLayer(layer, next) {
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
      return false;
    }
    loading.delete(layer);
  }
  state = applyLayerChange(state, layer, next, index);
  viewer.setLayerState(layer, next);
  render();
  return true;
}

// ── 성별 ──
function setSex(next) {
  if (next === sex) return;
  sex = next;
  viewer.setSex(sex);
  if (!skinAllowed(sex) && state.layers.skin !== 'off') {
    state = applyLayerChange(state, 'skin', 'off', index);
    viewer.setLayerState('skin', 'off');
  }
  if (state.selected && !visibleForSex(index[state.selected], sex)) state = { ...state, selected: null };
  render();
}

// ── 다른 구조물로 이동 (검색, 연결된 구조물, 이름표) ──
async function goTo(mesh) {
  const target = resolveTarget(mesh, index, { sex, layers: state.layers });
  if (target.sex !== sex) setSex(target.sex);
  for (const layer of target.layersToTurnOn) {
    if (!(await setLayer(layer, 'on'))) return;
  }
  for (const layer of layersToGhost(index[mesh]?.layer, state.layers)) {
    state = applyLayerChange(state, layer, 'ghost', index);
    viewer.setLayerState(layer, 'ghost');
  }
  state = { ...state, selected: mesh, hidden: state.hidden.filter((n) => n !== mesh) };
  render();
  viewer.focusOn(mesh);
}

// ── 검색 ──
function renderSearch() {
  const q = $('search-input').value;
  const results = search(q, index, content);
  $('search-results').innerHTML = results
    .map((r) => `<li><button type="button" role="option" data-goto="${escapeHtml(r.mesh)}"><span>${escapeHtml(r.title)}</span>${r.subtitle ? `<small>${escapeHtml(r.subtitle)}</small>` : ''}</button></li>`)
    .join('') || (q.trim() ? '<li class="search-none">찾는 이름이 없어요. 다른 이름이나 영어로 찾아 보세요.</li>' : '');
}
function openSearch(open) {
  $('search').hidden = !open;
  $('search-open').setAttribute('aria-expanded', String(open));
  if (open) { $('search-input').value = ''; renderSearch(); $('search-input').focus(); }
}

// ── 이름표 ──
let labelTimer = null;
function scheduleLabels() {
  if (!labelsOn || labelTimer) return;
  labelTimer = setTimeout(() => { labelTimer = null; drawLabels(); }, 120);
}
const shortName = (mesh) => (contentFor(mesh, index, content)?.name_ko ?? '').replace(/\s*\(.*\)\s*/, '');
function drawLabels() {
  const box = $('labels');
  if (!labelsOn) { box.innerHTML = ''; return; }
  const names = labelNames.filter((n) => visibleForSex(index[n], sex));
  const cands = viewer.labelCandidates(names).map((c) => ({ ...c, w: shortName(c.mesh).length * 13 + 16 }));
  const placed = new Set(placeLabels(cands, 24));
  box.innerHTML = cands.filter((c) => placed.has(c.mesh))
    .map((c) => `<button type="button" class="label" data-goto="${escapeHtml(c.mesh)}" style="left:${c.x.toFixed(0)}px;top:${c.y.toFixed(0)}px">${escapeHtml(shortName(c.mesh))}</button>`)
    .join('');
}

function bindUi() {
  for (const btn of document.querySelectorAll('[data-layer]')) {
    btn.addEventListener('click', () => onLayerTap(btn.dataset.layer));
  }
  for (const btn of document.querySelectorAll('[data-sex]')) btn.addEventListener('click', () => setSex(btn.dataset.sex));
  for (const btn of document.querySelectorAll('[data-region]')) {
    btn.addEventListener('click', () => viewer.flyToPreset(REGION_PRESETS.find((r) => r.id === btn.dataset.region)));
  }
  // 연결된 구조물·검색 결과·이름표: data-goto를 누르면 이동
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goto]');
    if (!el) return;
    openSearch(false);
    goTo(el.dataset.goto);
  });
  $('search-open').addEventListener('click', () => openSearch($('search').hidden));
  $('search-input').addEventListener('input', renderSearch);
  $('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openSearch(false);
    if (e.key === 'Enter') { const first = $('search-results').querySelector('[data-goto]'); if (first) first.click(); }
  });
  $('toggle-labels').addEventListener('click', () => {
    labelsOn = !labelsOn;
    $('toggle-labels').setAttribute('aria-pressed', String(labelsOn));
    drawLabels();
  });
  $('toggle-section').addEventListener('click', () => {
    const on = $('section-bar').hidden;
    $('section-bar').hidden = !on;
    $('toggle-section').setAttribute('aria-pressed', String(on));
    viewer.setClip(on ? Number($('section-height').value) : null);
  });
  $('section-height').addEventListener('input', (e) => viewer.setClip(Number(e.target.value)));
  $('sheet-close').addEventListener('click', () => { state = { ...state, selected: null }; render(); });
  $('act-focus').addEventListener('click', () => { if (state.selected) viewer.focusOn(state.selected); });
  $('act-hide').addEventListener('click', () => { state = hideSelected(state); render(); });
  $('act-isolate').addEventListener('click', () => { state = isolateSelected(state, index); render(); });
  $('show-all').addEventListener('click', () => { state = showAll(state); render(); });
  $('info-open').addEventListener('click', () => $('about').showModal());
  wide.addEventListener('change', render);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('search').hidden) { openSearch(false); return; }
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
    onRender: scheduleLabels,
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
    labelNames = Object.keys(index).filter((n) => contentFor(n, index, content));
  } catch (err) {
    showError(err);
    return;
  }
  $('loading').hidden = true;
  bindUi();
  render();
}

start();
