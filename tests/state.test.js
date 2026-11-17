import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, nextState, resolveTap } from '../js/state.js';

test('initialState is muscle front with nothing selected', () => {
  assert.deepEqual(initialState(), { system: 'muscle', side: 'front', selectedId: null });
});

test('select sets selectedId and close clears it', () => {
  const s1 = nextState(initialState(), { type: 'select', id: 'deltoid' });
  assert.equal(s1.selectedId, 'deltoid');
  assert.equal(nextState(s1, { type: 'close' }).selectedId, null);
});

test('setSide to a different side clears selection', () => {
  const s = nextState({ system: 'muscle', side: 'front', selectedId: 'deltoid' }, { type: 'setSide', side: 'back' });
  assert.deepEqual(s, { system: 'muscle', side: 'back', selectedId: null });
});

test('setSide to the same side keeps selection', () => {
  const s = nextState({ system: 'muscle', side: 'front', selectedId: 'deltoid' }, { type: 'setSide', side: 'front' });
  assert.equal(s.selectedId, 'deltoid');
});

test('setSystem to a different system clears selection', () => {
  const s = nextState({ system: 'muscle', side: 'front', selectedId: 'deltoid' }, { type: 'setSystem', system: 'bone' });
  assert.deepEqual(s, { system: 'bone', side: 'front', selectedId: null });
});

test('setSystem to the same system keeps selection', () => {
  const s = nextState({ system: 'bone', side: 'front', selectedId: 'skull' }, { type: 'setSystem', system: 'bone' });
  assert.equal(s.selectedId, 'skull');
});

test('nextState does not mutate input', () => {
  const s0 = initialState();
  nextState(s0, { type: 'select', id: 'x' });
  assert.equal(s0.selectedId, null);
});

test('resolveTap returns null outside any part', () => {
  assert.equal(resolveTap({ closest: () => null }), null);
});

test('resolveTap returns the part id of the nearest part group', () => {
  let asked;
  const target = { closest: (sel) => { asked = sel; return { dataset: { partId: 'skull' } }; } };
  assert.equal(resolveTap(target), 'skull');
  assert.equal(asked, '.part');
});
