import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, contentFor } from '../js/content.js';

const index = JSON.parse(readFileSync(new URL('../model/index.json', import.meta.url), 'utf8'));
const content = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

const base = { name_ko: '가', name_en: 'A', name_la: 'A', summary: '설명' };
const fakeIndex = { 'Femur.l': { base: 'Femur', side: 'l', layer: 'bone', group: 'g' } };

test('content.json is valid against index', () => {
  assert.deepEqual(validateContent(content, index), []);
});

test('content.json has at least 70 entries with planned coverage', () => {
  const entries = Object.values(content);
  assert.ok(entries.length >= 70, `${entries.length}`);
  const layerOf = (key) => Object.values(index).find((v) => v.base === key)?.layer;
  const count = (layer) => Object.keys(content).filter((k) => layerOf(k) === layer).length;
  assert.ok(count('muscle') >= 35, `muscle ${count('muscle')}`);
  assert.ok(count('bone') >= 20, `bone ${count('bone')}`);
  for (const l of ['organ', 'vessel', 'nerve']) assert.ok(count(l) >= 4, `${l} ${count(l)}`);
  assert.equal(count('skin'), 1);
});

test('muscle entry missing innervation is an error', () => {
  const errs = validateContent({ Femur: { ...base, kind: 'muscle', origin: 'o', insertion: 'i', action: 'a' } }, fakeIndex);
  assert.ok(errs.some((e) => e.includes('innervation')));
});

test('bone entry missing joints is an error', () => {
  const errs = validateContent({ Femur: { ...base, kind: 'bone', landmarks: 'l' } }, fakeIndex);
  assert.ok(errs.some((e) => e.includes('joints')));
});

test('other entry missing role is an error', () => {
  const errs = validateContent({ Femur: { ...base, kind: 'other' } }, fakeIndex);
  assert.ok(errs.some((e) => e.includes('role')));
});

test('unknown key or alias is an error', () => {
  const ok = { ...base, kind: 'bone', landmarks: 'l', joints: 'j' };
  assert.ok(validateContent({ Nope: ok }, fakeIndex).some((e) => e.includes('Nope')));
  assert.ok(validateContent({ Femur: { ...ok, bases: ['Ghost'] } }, fakeIndex).some((e) => e.includes('Ghost')));
});

test('left and right meshes share one entry', () => {
  const l = contentFor('Femur.l', index, content);
  assert.ok(l);
  assert.equal(l, contentFor('Femur.r', index, content));
});

test('alias bases resolve to the main entry (biceps heads)', () => {
  const entry = contentFor('Long head of biceps brachii.l', index, content);
  assert.ok(entry);
  assert.equal(entry, contentFor('Short head of biceps brachii.r', index, content));
});

test('mesh without content returns null', () => {
  assert.equal(contentFor('Femur.l', fakeIndex, {}), null);
  assert.equal(contentFor('Not a mesh', index, content), null);
});

test('review corrections stay in content', () => {
  assert.match(content['Internal jugular vein'].role, /팔머리정맥/);
  assert.match(content['Femoral artery'].role, /모음근틈새/);
  assert.match(content['Urinary bladder'].fact, /150~250mL/);
  assert.match(content['Vertebra T6'].fact, /T1–T10/);
  assert.match(content['Vertebra C5'].landmarks, /C3–C6/);
  assert.match(content['Sternocostal head of pectoralis major muscle'].fact, /배 부분/);
});

test('aortic arch and pulmonary bifurcation resolve to their vessel entries', () => {
  const name = (base) => Object.keys(index).find((k) => index[k].base === base);
  assert.equal(contentFor(name('Aortic arch'), index, content)?.name_ko, '대동맥');
  assert.equal(contentFor(name('Bifurcation of pulmonary trunk'), index, content)?.name_ko, '폐동맥줄기');
});

const TYPES = ['신경', '뼈', '혈관', '근육', '장기', '관절'];
const NO_NERVE_MESH = ['Diaphragm', 'Psoas major', 'Gluteus maximus muscle']; // 가로막신경·허리신경얼기·아래볼기신경 메시가 모델에 없음

test('related entries reference existing meshes with known types', () => {
  const errs = validateContent({ Femur: { ...base, kind: 'bone', landmarks: 'l', joints: 'j', related: [{ type: '뼈', bases: ['Ghost'] }] } }, fakeIndex);
  assert.ok(errs.some((e) => e.includes('Ghost')));
  const errs2 = validateContent({ Femur: { ...base, kind: 'bone', landmarks: 'l', joints: 'j', related: [{ type: '질환', bases: ['Femur'] }] } }, fakeIndex);
  assert.ok(errs2.some((e) => e.includes('질환')));
});

test('every entry has related structures; every muscle lists its nerve', () => {
  for (const [key, entry] of Object.entries(content)) {
    assert.ok(Array.isArray(entry.related) && entry.related.length > 0, key);
    for (const r of entry.related) assert.ok(TYPES.includes(r.type), `${key} ${r.type}`);
    if (entry.kind === 'muscle' && !NO_NERVE_MESH.includes(key)) {
      assert.ok(entry.related.some((r) => r.type === '신경'), `${key} has no nerve`);
    }
  }
});

test('reproductive organ entries exist for both sexes', () => {
  for (const k of ['Uterus', 'Ovary', 'Uterine tube', 'Prostate', 'Testis']) assert.ok(content[k], k);
  const name = (b) => Object.keys(index).find((k) => index[k].base === b);
  assert.equal(contentFor(name('Urinary bladder (female)'), index, content)?.name_ko, '방광');
});
