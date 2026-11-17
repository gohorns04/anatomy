import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html has a static load-error box that does not depend on the module', () => {
  assert.match(html, /<div[^>]*id="load-error"[^>]*hidden/);
  assert.match(html, /데이터를 불러오지 못했어요/);
});

test('index.html reveals the error box from a classic script on file:// or module failure', () => {
  const classic = [...html.matchAll(/<script(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.match(classic, /location\.protocol === 'file:'/);
  assert.match(html, /<script type="module"[^>]*onerror=/);
});
