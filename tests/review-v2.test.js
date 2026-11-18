import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveTarget } from '../js/sex.js';
import { search } from '../js/search.js';
import { relatedFor } from '../js/related.js';
import { placeLabels } from '../js/labels.js';
import { createSequence } from '../js/retry.js';

const index = JSON.parse(readFileSync(new URL('../model/index.json', import.meta.url), 'utf8'));
const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const layers = { skin: 'off', muscle: 'on', bone: 'on', organ: 'on', vessel: 'off', nerve: 'off' };

test('I2: jumping to skin in female mode is blocked', () => {
  assert.equal(resolveTarget('Skin', index, { sex: 'female', layers }).blocked, true);
  assert.ok(!resolveTarget('Skin', index, { sex: 'male', layers }).blocked);
});

test('I3: shared concept "방광" resolves to the mesh of the current sex', () => {
  assert.equal(search('방광', index, content, { sex: 'female' })[0].mesh, 'Urinary bladder (female)');
  assert.equal(search('방광', index, content, { sex: 'male' })[0].mesh, 'Urinary bladder');
  const kidney = Object.keys(index).find((k) => index[k].base === 'Kidney');
  const organs = relatedFor(kidney, index, content, { sex: 'female' }).find((g) => g.type === '장기');
  assert.ok(organs.items.some((i) => i.mesh === 'Urinary bladder (female)'));
  assert.ok(!organs.items.some((i) => i.mesh === 'Urinary bladder'));
});

test('I1: only the latest navigation is current', () => {
  const seq = createSequence();
  const a = seq.next();
  const b = seq.next();
  assert.equal(seq.isCurrent(a), false);
  assert.equal(seq.isCurrent(b), true);
});

test('I5: placeLabels checks occlusion only for labels that would be placed, and stops at max', () => {
  const asked = [];
  const c = (mesh, x, dist) => ({ mesh, x, y: 0, w: 40, h: 20, dist });
  const placed = placeLabels([c('a', 0, 1), c('b', 10, 2), c('c', 100, 3), c('d', 200, 4)], 2, (m) => { asked.push(m); return m !== 'c'; });
  assert.deepEqual(placed, ['a', 'd']);
  assert.deepEqual(asked, ['a', 'c', 'd'], 'overlapping b is skipped before any raycast');
});

test('I7 + content corrections from review', () => {
  const rel = (key, type) => content[key].related.filter((r) => r.type === type).flatMap((r) => r.bases);
  assert.ok(!rel('Gluteus maximus muscle', '신경').includes('Sciatic nerve'));
  assert.ok(!rel('Sciatic nerve', '근육').includes('Gluteus maximus muscle'));
  assert.ok(!rel('Rectus abdominis muscle', '뼈').includes('Manubrium of sternum'));
  assert.ok(!rel('Diaphragm', '뼈').includes('Manubrium of sternum'));
  assert.ok(rel('Pulmonary trunk', '장기').includes('Right ventricle'));
  assert.ok(rel('Superior vena cava', '장기').includes('Right atrium'));
  assert.equal(content['Superior vena cava'].related.filter((r) => r.type === '장기').length, 1);
  assert.ok(!rel('Skin', '장기').includes('Superior lobe of left lung'));
  assert.ok(rel('Testis', '혈관').includes('Right testicular vein'));
  assert.ok(!rel('Urinary bladder', '신경').includes('Pudendal nerve'));
});
