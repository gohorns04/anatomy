import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusDistance, clampTargetY, thumbFromView, targetYFromThumb, BODY_TOP } from '../js/camera-math.js';

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

test('clampTargetY keeps the view on the body', () => {
  assert.equal(clampTargetY(5), BODY_TOP);
  assert.equal(clampTargetY(-1), 0);
  assert.equal(clampTargetY(1), 1);
});

test('thumb shows the visible slice of the body: head at top, feet at bottom', () => {
  // 머리 쪽을 보고 있고, 몸 높이의 20%만 보이는 상태
  const t = thumbFromView(BODY_TOP - 0.1 * BODY_TOP, 0.2 * BODY_TOP);
  assert.ok(Math.abs(t.size - 0.2) < 1e-9);
  assert.ok(Math.abs(t.start - 0) < 1e-9, 'thumb at the top');
  const f = thumbFromView(0.1 * BODY_TOP, 0.2 * BODY_TOP);
  assert.ok(Math.abs(f.start - 0.8) < 1e-9, 'thumb at the bottom');
});

test('thumb is full when the whole body is visible', () => {
  const t = thumbFromView(0.9, 3);
  assert.equal(t.size, 1);
  assert.equal(t.start, 0);
});

test('targetYFromThumb inverts thumbFromView', () => {
  const visible = 0.3 * BODY_TOP;
  for (const y of [0.4, 0.9, 1.5]) {
    const t = thumbFromView(y, visible);
    assert.ok(Math.abs(targetYFromThumb(t.start, visible) - y) < 1e-9, String(y));
  }
});
