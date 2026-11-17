import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTapHandler } from '../js/tap.js';

function fakeClock() {
  let now = 0;
  const timers = [];
  return {
    setTimeout: (fn, ms) => { const t = { at: now + ms, fn }; timers.push(t); return t; },
    clearTimeout: (t) => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
    advance(ms) { now += ms; for (const t of [...timers]) if (t.at <= now) { timers.splice(timers.indexOf(t), 1); t.fn(); } },
  };
}

function setup() {
  const clock = fakeClock();
  const calls = [];
  const tap = createTapHandler({
    onSingle: (x, y) => calls.push(['single', x, y]),
    onDouble: () => calls.push(['double']),
    delay: 300, slop: 30, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
  });
  return { clock, calls, tap };
}

test('single tap fires only after the double-tap window', () => {
  const { clock, calls, tap } = setup();
  tap(10, 10);
  assert.deepEqual(calls, []);
  clock.advance(300);
  assert.deepEqual(calls, [['single', 10, 10]]);
});

test('double tap resets without selecting', () => {
  const { clock, calls, tap } = setup();
  tap(10, 10);
  clock.advance(150);
  tap(15, 12);
  clock.advance(500);
  assert.deepEqual(calls, [['double']]);
});

test('two quick taps far apart are two single taps', () => {
  const { clock, calls, tap } = setup();
  tap(10, 10);
  clock.advance(100);
  tap(200, 300);
  clock.advance(500);
  assert.deepEqual(calls, [['single', 10, 10], ['single', 200, 300]]);
});
