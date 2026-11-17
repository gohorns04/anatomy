import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  splitName, isPickable, applyLayerChange, hideSelected, isolateSelected, showAll, insertionNamesFor,
} from '../js/visibility.js';

const index = {
  'Biceps.l': { base: 'Biceps', side: 'l', layer: 'muscle', group: 'g' },
  'Biceps.r': { base: 'Biceps', side: 'r', layer: 'muscle', group: 'g' },
  'Femur.l': { base: 'Femur', side: 'l', layer: 'bone', group: 'g' },
  Skin: { base: 'Skin', side: '', layer: 'skin', group: 'g' },
};
const layers = { skin: 'ghost', muscle: 'on', bone: 'on', organ: 'off', vessel: 'off', nerve: 'off' };
const state = (over = {}) => ({ layers: { ...layers }, hidden: [], selected: null, ...over });

test('splitName strips side suffix and wrapping parentheses', () => {
  assert.deepEqual(splitName('Median nerve.l'), { base: 'Median nerve', suffix: 'l' });
  assert.deepEqual(splitName('(Abdominal part of pectoralis major muscle).ol'), { base: 'Abdominal part of pectoralis major muscle', suffix: 'ol' });
  assert.deepEqual(splitName('Skin'), { base: 'Skin', suffix: '' });
});

test('only meshes in an "on" layer and not hidden are pickable', () => {
  assert.equal(isPickable('Biceps.l', index, layers, new Set()), true);
  assert.equal(isPickable('Skin', index, layers, new Set()), false, 'ghost layer');
  assert.equal(isPickable('Femur.l', index, { ...layers, bone: 'off' }, new Set()), false, 'off layer');
  assert.equal(isPickable('Biceps.l', index, layers, new Set(['Biceps.l'])), false, 'hidden');
  assert.equal(isPickable('Unknown', index, layers, new Set()), false);
});

test('turning the selected mesh layer off clears selection; ghost keeps it', () => {
  const s = state({ selected: 'Biceps.l' });
  assert.equal(applyLayerChange(s, 'muscle', 'off', index).selected, null);
  assert.equal(applyLayerChange(s, 'muscle', 'ghost', index).selected, 'Biceps.l');
  assert.equal(applyLayerChange(s, 'bone', 'off', index).selected, 'Biceps.l');
  assert.equal(applyLayerChange(s, 'muscle', 'off', index).layers.muscle, 'off');
});

test('hideSelected moves selection into hidden', () => {
  const s = hideSelected(state({ selected: 'Biceps.l' }));
  assert.equal(s.selected, null);
  assert.deepEqual(s.hidden, ['Biceps.l']);
});

test('isolate hides everything else, survives layer changes, showAll clears', () => {
  let s = isolateSelected(state({ selected: 'Biceps.l' }), index);
  assert.equal(s.selected, 'Biceps.l');
  assert.deepEqual([...s.hidden].sort(), ['Biceps.r', 'Femur.l', 'Skin']);
  s = applyLayerChange(s, 'skin', 'on', index);
  assert.deepEqual([...s.hidden].sort(), ['Biceps.r', 'Femur.l', 'Skin']);
  assert.deepEqual(showAll(s).hidden, []);
});

test('state functions do not mutate input', () => {
  const s = state({ selected: 'Biceps.l' });
  hideSelected(s);
  isolateSelected(s, index);
  applyLayerChange(s, 'muscle', 'off', index);
  assert.equal(s.selected, 'Biceps.l');
  assert.deepEqual(s.hidden, []);
  assert.equal(s.layers.muscle, 'on');
});

test('insertions: same base and side only', () => {
  const r = insertionNamesFor('X muscle.l', ['X muscle.ol', 'X muscle.el', 'X muscle.or', 'Y.ol']);
  assert.deepEqual(r, { origins: ['X muscle.ol'], insertions: ['X muscle.el'] });
});

test('insertions: a head or part also gets its whole muscle markers', () => {
  const names = ['Long head of biceps brachii.ol', 'Long head of biceps brachii.or', 'Short head of biceps brachii.ol',
    'Biceps brachii muscle.el', 'Biceps brachii muscle.er', 'Triceps brachii muscle.el'];
  assert.deepEqual(insertionNamesFor('Long head of biceps brachii.l', names),
    { origins: ['Long head of biceps brachii.ol'], insertions: ['Biceps brachii muscle.el'] });
  assert.deepEqual(insertionNamesFor('Short head of biceps brachii.r', names),
    { origins: [], insertions: ['Biceps brachii muscle.er'] });
});

test('insertions: real data samples (deltoid, pectoralis, masseter)', () => {
  const buf = readFileSync(new URL('../model/insertions.glb', import.meta.url));
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  const names = json.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name);
  assert.deepEqual(insertionNamesFor('Acromial part of deltoid muscle.r', names),
    { origins: ['Acromial part of deltoid muscle.or'], insertions: ['Deltoid muscle.er'] });
  const pec = insertionNamesFor('Sternocostal head of pectoralis major muscle.l', names);
  assert.deepEqual(pec.insertions.sort(), ['Pectoralis major muscle.el', 'Sternocostal head of pectoralis major muscle.el']);
  assert.deepEqual(pec.origins, ['Pectoralis major muscle.ol']);
  assert.deepEqual(insertionNamesFor('Superficial part of masseter.l', names),
    { origins: ['Masseter.ol'], insertions: ['Masseter.el'] });
});

test('insertions: muscles whose markers live under a group name (quadriceps, triceps surae, iliopsoas, common extensor)', () => {
  const buf = readFileSync(new URL('../model/insertions.glb', import.meta.url));
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  const names = json.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name);
  assert.ok(insertionNamesFor('Rectus femoris muscle.l', names).insertions.includes('Quadriceps femoris muscle.el'));
  assert.ok(insertionNamesFor('Vastus medialis muscle.r', names).insertions.includes('Quadriceps femoris muscle.er'));
  assert.ok(insertionNamesFor('Soleus muscle.l', names).insertions.includes('Triceps surae muscle.el'));
  assert.ok(insertionNamesFor('Medial head of gastrocnemius.r', names).insertions.includes('Triceps surae muscle.er'));
  assert.ok(insertionNamesFor('Psoas major.l', names).insertions.includes('Iliopsoas muscle.el'));
  assert.ok(insertionNamesFor('Iliacus muscle.r', names).insertions.includes('Iliopsoas muscle.er'));
  assert.ok(insertionNamesFor('Extensor digitorum.l', names).origins.includes('Common extensor tendon.ol'));
});
