import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusDistance } from '../js/camera-math.js';

test('focusDistance frames an object so it fills about 60% of the shorter side', () => {
  const d = focusDistance(0.2, 30, 1.6);
  const visible = 2 * d * Math.tan((15 * Math.PI) / 180);
  assert.ok(Math.abs(0.2 / visible - 0.6) < 1e-9);
});

test('focusDistance accounts for narrow (portrait) screens', () => {
  assert.ok(focusDistance(0.2, 30, 0.5) > focusDistance(0.2, 30, 1.6));
});

test('focusDistance never goes closer than the near limit', () => {
  assert.equal(focusDistance(0.001, 30, 1), 0.25);
});
