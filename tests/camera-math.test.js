import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusDistance, scrollPanAmount, clampTargetY } from '../js/camera-math.js';

test('focusDistance frames an object so it fills about 60% of the shorter side', () => {
  // 높이 0.2m 물체, 세로 시야 30°, 가로가 더 넓은 화면
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

test('scrollPanAmount scales with camera distance and direction of wheel', () => {
  assert.ok(Math.abs(scrollPanAmount(100, 2)) > Math.abs(scrollPanAmount(100, 1)));
  assert.ok(scrollPanAmount(100, 1) < 0, 'wheel down moves view down');
  assert.ok(scrollPanAmount(-100, 1) > 0);
});

test('clampTargetY keeps the view on the body', () => {
  assert.equal(clampTargetY(5), 1.85);
  assert.equal(clampTargetY(-1), 0);
  assert.equal(clampTargetY(1), 1);
});
