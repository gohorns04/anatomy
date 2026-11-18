import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('importmap maps three and three/addons to vendored files', () => {
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.equal(map.imports.three, './vendor/three/three.module.js');
  assert.equal(map.imports['three/addons/'], './vendor/three/addons/');
});

test('both attribution lines appear verbatim', () => {
  assert.ok(html.includes('Z-Anatomy (Gauthier Kervyn, Marcin Zielinski), CC BY-SA 4.0'));
  assert.ok(html.includes('BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'));
  assert.ok(html.includes('href="model/LICENSE.txt"'));
});

test('static load-error box and classic file:// fallback exist', () => {
  assert.match(html, /<div[^>]*id="load-error"[^>]*hidden/);
  const classic = [...html.matchAll(/<script(?![^>]*type="(?:module|importmap)")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.match(classic, /location\.protocol === 'file:'/);
  assert.match(html, /<script type="module"[^>]*onerror=/);
});

test('six layer buttons in order', () => {
  const ids = [...html.matchAll(/data-layer="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['skin', 'muscle', 'bone', 'organ', 'vessel', 'nerve']);
});

test('load error box offers a retry that works without the module', () => {
  assert.match(html, /<button[^>]*id="load-retry"[^>]*onclick="location\.reload\(\)"/);
});

test('a module linking error (e.g. stale cached module) shows the load error instead of hanging', () => {
  const classic = [...html.matchAll(/<script(?![^>]*type="(?:module|importmap)")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  assert.match(classic, /addEventListener\('error'/);
  assert.match(classic, /__appStarted/);
});

test('v2 controls: search, sex toggle, labels and section toggles, ten region buttons, section slider', () => {
  assert.match(html, /id="search-open"/);
  assert.match(html, /<input[^>]*id="search-input"/);
  assert.match(html, /data-sex="male"/);
  assert.match(html, /data-sex="female"/);
  assert.match(html, /id="toggle-labels"/);
  assert.match(html, /id="toggle-section"/);
  assert.equal([...html.matchAll(/data-region="/g)].length, 10);
  assert.match(html, /<input[^>]*type="range"[^>]*id="section-height"/);
});

test('info panel split into description and related parts', () => {
  assert.match(html, /id="info-top"/);
  assert.match(html, /id="info-related"/);
});

test('Human Reference Atlas is credited in the about dialog', () => {
  assert.match(html, /HuBMAP CCF 3D Reference Object Library/);
});
