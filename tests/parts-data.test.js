import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateParts } from '../js/model.js';

const parts = JSON.parse(readFileSync(new URL('../data/parts.json', import.meta.url), 'utf8'));

const F = ['front'];
const B = ['back'];
const FB = ['front', 'back'];

const EXPECTED = {
  muscle: {
    deltoid: FB, 'pectoralis-major': F, 'biceps-brachii': F, 'triceps-brachii': B,
    'forearm-flexors': F, 'rectus-abdominis': F, 'external-oblique': F, quadriceps: F,
    'tibialis-anterior': F, sternocleidomastoid: F, trapezius: B, 'latissimus-dorsi': B,
    'gluteus-maximus': B, hamstrings: B, gastrocnemius: B,
  },
  bone: {
    skull: FB, clavicle: F, scapula: B, sternum: F, ribs: FB, 'vertebral-column': B,
    humerus: FB, radius: F, ulna: FB, 'hand-bones': FB, pelvis: FB, femur: FB,
    patella: F, tibia: F, fibula: FB, 'foot-bones': FB,
  },
};

test('parts.json is valid', () => {
  assert.deepEqual(validateParts(parts), []);
});

test('parts.json has exactly the 31 planned parts', () => {
  assert.equal(parts.length, 31);
  const expectedIds = [...Object.keys(EXPECTED.muscle), ...Object.keys(EXPECTED.bone)].sort();
  assert.deepEqual(parts.map((p) => p.id).sort(), expectedIds);
});

test('parts.json has 15 muscles and 16 bones with planned sides', () => {
  assert.equal(parts.filter((p) => p.system === 'muscle').length, 15);
  assert.equal(parts.filter((p) => p.system === 'bone').length, 16);
  for (const p of parts) {
    assert.deepEqual(p.sides, EXPECTED[p.system][p.id], p.id);
  }
});
