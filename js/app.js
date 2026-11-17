import { validateParts, findPart } from './model.js';
import { renderBody } from './body-svg.js';
import { renderSheet } from './sheet.js';
import { initialState, nextState, resolveTap } from './state.js';

const $ = (id) => document.getElementById(id);
const figure = $('figure');
const sheet = $('sheet');
const sheetBody = $('sheet-body');
const hint = $('hint');

let parts = [];
let state = initialState();

function dispatch(action) {
  const prev = state;
  state = nextState(state, action);
  if (state !== prev) render(prev);
}

function syncSegments() {
  for (const group of document.querySelectorAll('[data-control]')) {
    const value = state[group.dataset.control];
    for (const btn of group.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.value === value));
    }
  }
}

function render(prev = {}) {
  document.documentElement.dataset.system = state.system;
  figure.innerHTML = renderBody(parts, state.system, state.side, state.selectedId);
  syncSegments();

  const part = state.selectedId ? findPart(parts, state.selectedId) : null;
  const open = Boolean(part);
  if (part) sheetBody.innerHTML = renderSheet(part);
  sheet.classList.toggle('open', open);
  sheet.setAttribute('aria-hidden', String(!open));
  sheet.inert = !open;
  document.body.classList.toggle('sheet-open', open);
  hint.hidden = open;

  if (open && !prev.selectedId) sheet.scrollTop = 0;
}

function showError() {
  document.body.classList.add('error');
  $('load-error').hidden = false;
}

function tapAt(target) {
  const id = resolveTap(target);
  dispatch(id ? { type: 'select', id } : { type: 'close' });
}

function bindEvents() {
  for (const group of document.querySelectorAll('[data-control]')) {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const key = group.dataset.control;
      dispatch(key === 'system' ? { type: 'setSystem', system: btn.dataset.value } : { type: 'setSide', side: btn.dataset.value });
    });
  }

  $('stage').addEventListener('click', (e) => tapAt(e.target));
  figure.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const id = resolveTap(e.target);
    if (!id) return;
    e.preventDefault();
    dispatch({ type: 'select', id });
  });
  $('sheet-close').addEventListener('click', () => dispatch({ type: 'close' }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') dispatch({ type: 'close' });
  });
}

async function start() {
  try {
    const res = await fetch('data/parts.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const errors = validateParts(data);
    if (errors.length) throw new Error(errors.join('\n'));
    parts = data;
  } catch (err) {
    console.error('parts.json load failed:', err);
    showError();
    return;
  }
  bindEvents();
  render();
}

start();
