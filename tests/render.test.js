import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partsForView, SIDES } from '../js/model.js';
import { REGIONS, SILHOUETTE, VIEWBOX } from '../js/regions.js';
import { renderBody } from '../js/body-svg.js';
import { renderSheet, escapeHtml } from '../js/sheet.js';

const parts = JSON.parse(readFileSync(new URL('../data/parts.json', import.meta.url), 'utf8'));

const idsIn = (svg) => [...svg.matchAll(/data-part-id="([^"]+)"/g)].map((m) => m[1]);
const groupFor = (svg, id) => svg.match(new RegExp(`<g[^>]*data-part-id="${id}"[^>]*>[\\s\\S]*?</g>`))[0];

test('VIEWBOX and silhouettes exist for both sides', () => {
  assert.equal(VIEWBOX, '0 0 200 500');
  for (const side of SIDES) assert.ok(SILHOUETTE[side].length > 0, side);
});

test('every part has regions for each of its sides', () => {
  for (const p of parts) {
    for (const side of p.sides) {
      assert.ok(Array.isArray(REGIONS[p.id]?.[side]) && REGIONS[p.id][side].length >= 1, `${p.id} ${side}`);
    }
  }
});

test('REGIONS has no ids missing from parts.json', () => {
  const ids = new Set(parts.map((p) => p.id));
  for (const id of Object.keys(REGIONS)) assert.ok(ids.has(id), id);
});

test('all region and silhouette coordinates stay inside the viewBox', () => {
  const all = [SILHOUETTE.front, SILHOUETTE.back, ...Object.values(REGIONS).flatMap((r) => [...(r.front ?? []), ...(r.back ?? [])])];
  for (const d of all) {
    assert.match(d, /^[MLCQZ0-9.\s,-]+$/, `only absolute M/L/C/Q/Z commands: ${d.slice(0, 40)}`);
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      assert.ok(nums[i] >= 0 && nums[i] <= 200, `x ${nums[i]} in ${d.slice(0, 40)}`);
      assert.ok(nums[i + 1] >= 0 && nums[i + 1] <= 500, `y ${nums[i + 1]} in ${d.slice(0, 40)}`);
    }
  }
});

test('renderBody draws exactly the parts in view', () => {
  for (const system of ['muscle', 'bone']) {
    for (const side of SIDES) {
      const svg = renderBody(parts, system, side, null);
      assert.ok(svg.startsWith('<svg'), 'starts with svg');
      assert.ok(svg.includes(`viewBox="${VIEWBOX}"`));
      assert.ok(svg.includes('class="silhouette"'));
      assert.deepEqual(idsIn(svg).sort(), partsForView(parts, system, side).map((p) => p.id).sort(), `${system} ${side}`);
    }
  }
});

test('renderBody marks the selected paired part with both paths', () => {
  const svg = renderBody(parts, 'muscle', 'front', 'biceps-brachii');
  const g = groupFor(svg, 'biceps-brachii');
  assert.match(g, /class="part selected"/);
  assert.equal((g.match(/<path/g) || []).length, 2);
  assert.doesNotMatch(groupFor(svg, 'deltoid'), /selected/);
});

test('renderSheet shows all names and texts', () => {
  const p = parts.find((x) => x.id === 'femur');
  const html = renderSheet(p);
  for (const field of ['name_ko', 'name_en', 'name_la', 'summary', 'fact']) {
    assert.ok(html.includes(escapeHtml(p[field])), field);
  }
});

test('renderSheet escapes html in text', () => {
  const html = renderSheet({ ...parts[0], name_ko: '<b>&' });
  assert.ok(html.includes('&lt;b&gt;&amp;'));
  assert.ok(!html.includes('<b>'));
});

test('escapeHtml escapes quotes', () => {
  assert.equal(escapeHtml(`"'`), '&quot;&#39;');
});
