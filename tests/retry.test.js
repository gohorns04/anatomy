import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onceUntilSuccess } from '../js/retry.js';

test('a successful load is reused', async () => {
  let calls = 0;
  const load = onceUntilSuccess(async () => { calls += 1; return 'ok'; });
  assert.equal(await load(), 'ok');
  assert.equal(await load(), 'ok');
  assert.equal(calls, 1);
});

test('a failed load is retried on the next call', async () => {
  let calls = 0;
  const load = onceUntilSuccess(async () => { calls += 1; if (calls === 1) throw new Error('net'); return 'ok'; });
  await assert.rejects(load(), /net/);
  assert.equal(await load(), 'ok');
  assert.equal(calls, 2);
});
