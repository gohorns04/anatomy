import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAYERS, initialLayerStates, nextLayerState, layerEvent, needsLoad } from '../js/layers.js';

test('six layers in order with Korean labels', () => {
  assert.deepEqual(LAYERS.map((l) => l.id), ['skin', 'muscle', 'bone', 'organ', 'vessel', 'nerve']);
  assert.deepEqual(LAYERS.map((l) => l.label), ['피부', '근육', '뼈', '장기', '혈관', '신경']);
});

test('initial states: muscle and bone on, rest off', () => {
  assert.deepEqual(initialLayerStates(), { skin: 'off', muscle: 'on', bone: 'on', organ: 'off', vessel: 'off', nerve: 'off' });
});

test('tap cycles on -> ghost -> off -> on', () => {
  assert.equal(nextLayerState('on'), 'ghost');
  assert.equal(nextLayerState('ghost'), 'off');
  assert.equal(nextLayerState('off'), 'on');
});

test('layerEvent tap advances one layer only; loadFailed turns it off', () => {
  const s = initialLayerStates();
  const t = layerEvent(s, 'skin', 'tap');
  assert.equal(t.skin, 'on');
  assert.equal(t.muscle, 'on');
  assert.equal(s.skin, 'off', 'no mutation');
  assert.equal(layerEvent(t, 'skin', 'loadFailed').skin, 'off');
});

test('needsLoad only for layers not loaded yet', () => {
  assert.equal(needsLoad('nerve', new Set(['muscle', 'bone'])), true);
  assert.equal(needsLoad('muscle', new Set(['muscle', 'bone'])), false);
});
