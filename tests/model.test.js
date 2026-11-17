import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateParts, partsForView, findPart, SYSTEMS, SIDES } from '../js/model.js';

const valid = (over = {}) => ({
  id: 'biceps-brachii',
  system: 'muscle',
  sides: ['front'],
  name_ko: '위팔두갈래근',
  name_en: 'Biceps brachii',
  name_la: 'Musculus biceps brachii',
  summary: '팔꿈치를 굽혀요.',
  fact: '힘줄이 두 갈래예요.',
  ...over,
});

test('SYSTEMS and SIDES constants', () => {
  assert.deepEqual(SYSTEMS, ['muscle', 'bone']);
  assert.deepEqual(SIDES, ['front', 'back']);
});

test('validateParts accepts a valid list', () => {
  assert.deepEqual(validateParts([valid()]), []);
});

test('validateParts reports duplicate ids by name', () => {
  const errors = validateParts([valid(), valid()]);
  assert.ok(errors.some((e) => e.includes('biceps-brachii')));
});

test('validateParts rejects unknown system', () => {
  assert.ok(validateParts([valid({ system: 'organ' })]).length >= 1);
});

test('validateParts rejects empty sides', () => {
  assert.ok(validateParts([valid({ sides: [] })]).length >= 1);
});

test('validateParts rejects unknown side', () => {
  assert.ok(validateParts([valid({ sides: ['left'] })]).length >= 1);
});

test('validateParts rejects empty latin name', () => {
  assert.ok(validateParts([valid({ name_la: '' })]).length >= 1);
});

test('partsForView filters by system and side', () => {
  const parts = [
    valid({ id: 'a', system: 'muscle', sides: ['front'] }),
    valid({ id: 'b', system: 'muscle', sides: ['back'] }),
    valid({ id: 'c', system: 'muscle', sides: ['front', 'back'] }),
    valid({ id: 'd', system: 'bone', sides: ['front'] }),
  ];
  assert.deepEqual(partsForView(parts, 'muscle', 'front').map((p) => p.id), ['a', 'c']);
  assert.deepEqual(partsForView(parts, 'muscle', 'back').map((p) => p.id), ['b', 'c']);
  assert.deepEqual(partsForView(parts, 'bone', 'front').map((p) => p.id), ['d']);
});

test('findPart returns part or null', () => {
  const parts = [valid()];
  assert.equal(findPart(parts, 'biceps-brachii').id, 'biceps-brachii');
  assert.equal(findPart(parts, '없는id'), null);
});
