import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { visibleForSex, resolveTarget, skinAllowed } from '../js/sex.js';
import { toChoseong, search } from '../js/search.js';
import { relatedFor } from '../js/related.js';
import { placeLabels } from '../js/labels.js';
import { REGION_PRESETS } from '../js/regions.js';
import { belowClip } from '../js/clip.js';

const index = JSON.parse(readFileSync(new URL('../model/index.json', import.meta.url), 'utf8'));
const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));
const layersOn = { skin: 'off', muscle: 'on', bone: 'on', organ: 'off', vessel: 'off', nerve: 'off' };

// ── 성별 ──
test('sex: shared meshes always visible, sex-specific only in that mode', () => {
  assert.equal(visibleForSex(index['Liver'], 'female'), true);
  assert.equal(visibleForSex(index['Prostate'], 'female'), false);
  assert.equal(visibleForSex(index['Prostate'], 'male'), true);
  assert.equal(visibleForSex(index['Uterus'], 'male'), false);
  assert.equal(visibleForSex(index['Uterus'], 'female'), true);
});

test('sex: skin layer only in male mode', () => {
  assert.equal(skinAllowed('male'), true);
  assert.equal(skinAllowed('female'), false);
});

test('resolveTarget switches sex and turns on the needed layer', () => {
  assert.deepEqual(resolveTarget('Uterus', index, { sex: 'male', layers: layersOn }), { sex: 'female', layersToTurnOn: ['organ'] });
  assert.deepEqual(resolveTarget('Femur.l', index, { sex: 'female', layers: layersOn }), { sex: 'female', layersToTurnOn: [] });
  assert.deepEqual(resolveTarget('Median nerve.r', index, { sex: 'male', layers: layersOn }), { sex: 'male', layersToTurnOn: ['nerve'] });
});

// ── 검색 ──
test('toChoseong maps Hangul syllables to initial consonants', () => {
  assert.equal(toChoseong('위팔두갈래근'), 'ㅇㅍㄷㄱㄹㄱ');
  assert.equal(toChoseong('A간'), 'Aㄱ');
});

test('search: Korean exact name comes first, one result per content entry', () => {
  const r = search('간', index, content);
  assert.equal(r[0].title, '간');
  const biceps = search('위팔두갈래근', index, content);
  assert.equal(biceps.filter((x) => x.title.startsWith('위팔두갈래근')).length, 1);
});

test('search: English, Latin, Hanja alias and choseong all work', () => {
  assert.ok(search('femur', index, content).some((x) => x.title.startsWith('넙다리뼈')));
  assert.ok(search('musculus deltoideus', index, content).some((x) => x.title.startsWith('어깨세모근')));
  assert.ok(search('이두근', index, content).some((x) => x.title.startsWith('위팔두갈래근')));
  assert.ok(search('ㅇㅍㄷㄱㄹㄱ', index, content).some((x) => x.title.startsWith('위팔두갈래근')));
});

test('search: meshes without content are found by English name; results capped', () => {
  assert.ok(search('popliteal artery', index, content).some((x) => x.mesh.startsWith('Popliteal artery')));
  assert.ok(search('a', index, content).length <= 20);
  assert.deepEqual(search('   ', index, content), []);
});

test('search: paired structures resolve to the right-side mesh', () => {
  const r = search('넙다리뼈', index, content)[0];
  assert.equal(r.mesh, 'Femur.r');
});

test('search includes female organs even in male mode', () => {
  assert.ok(search('자궁', index, content).some((x) => x.mesh === 'Uterus'));
});

// ── 연결된 구조물 ──
test('relatedFor uses content related and keeps the selected side', () => {
  const groups = relatedFor('Long head of biceps brachii.l', index, content);
  const nerve = groups.find((g) => g.type === '신경');
  assert.equal(nerve.items[0].mesh, 'Musculocutaneous nerve.l');
  assert.ok(nerve.items[0].title.length > 0);
});

test('relatedFor falls back to same-group siblings (max 8) without content', () => {
  const groups = relatedFor('Popliteal artery.l', index, content);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].type, '같은 부위');
  assert.ok(groups[0].items.length > 0 && groups[0].items.length <= 8);
  assert.ok(!groups[0].items.some((i) => i.mesh.startsWith('Popliteal artery')));
});

// ── 이름표 ──
test('placeLabels keeps center-most labels, skips overlaps, caps the count', () => {
  const c = (mesh, x, y, dist) => ({ mesh, x, y, w: 60, h: 20, dist });
  const placed = placeLabels([c('a', 100, 100, 5), c('b', 110, 105, 1), c('c', 300, 300, 10)], 24);
  assert.deepEqual(placed, ['b', 'c']);
  const many = Array.from({ length: 50 }, (_, i) => c(`m${i}`, (i % 10) * 100, Math.floor(i / 10) * 40, i));
  assert.equal(placeLabels(many, 24).length, 24);
});

// ── 부위 바로가기 ──
test('region presets: ten unique regions with sane camera values', () => {
  assert.equal(REGION_PRESETS.length, 10);
  assert.equal(new Set(REGION_PRESETS.map((r) => r.id)).size, 10);
  assert.deepEqual(REGION_PRESETS.map((r) => r.label), ['머리', '목', '가슴', '배', '골반', '팔', '손', '다리', '발', '등']);
  for (const r of REGION_PRESETS) {
    assert.ok(r.target[1] >= 0 && r.target[1] <= 1.85, r.id);
    assert.ok(r.distance > 0.2 && r.distance < 3, r.id);
    assert.ok(Math.abs(Math.hypot(...r.dir) - 1) < 1e-6, r.id);
  }
  assert.ok(REGION_PRESETS.find((r) => r.id === 'back').dir[2] < 0, 'back looks from behind');
});

// ── 단면 ──
test('belowClip: points above the cut are ignored for picking', () => {
  assert.equal(belowClip(1.2, null), true);
  assert.equal(belowClip(1.2, 1.0), false);
  assert.equal(belowClip(0.8, 1.0), true);
});
