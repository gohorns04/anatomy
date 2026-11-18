import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';

const MODEL = new URL('../model/', import.meta.url);
const LAYERS = ['skin', 'muscle', 'bone', 'organ', 'vessel', 'nerve'];
const FEMALE = ['Uterus', 'Ovary.l', 'Ovary.r', 'Uterine tube.l', 'Uterine tube.r', 'Urinary bladder (female)'];
const index = JSON.parse(readFileSync(new URL('index.json', MODEL), 'utf8'));

// glb의 JSON 청크만 읽어 노드 정보를 얻는다(지오메트리 디코딩 불필요).
function glbJson(file) {
  const buf = readFileSync(new URL(file, MODEL));
  assert.equal(buf.readUInt32LE(0), 0x46546c67, `${file} is not glb`);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}
const meshNodeNames = (json) => (json.nodes || []).filter((n) => n.mesh !== undefined).map((n) => n.name);

test('every layer glb and insertions.glb exist', () => {
  for (const f of [...LAYERS.map((l) => `${l}.glb`), 'insertions.glb']) {
    assert.ok(existsSync(new URL(f, MODEL)), f);
  }
});

test('first load (muscle + bone) is at most 20MB', () => {
  const bytes = statSync(new URL('muscle.glb', MODEL)).size + statSync(new URL('bone.glb', MODEL)).size;
  assert.ok(bytes <= 20 * 1024 * 1024, `${(bytes / 1048576).toFixed(1)}MB`);
});

test('all glbs use meshopt compression', () => {
  for (const l of LAYERS) {
    assert.ok((glbJson(`${l}.glb`).extensionsUsed || []).includes('EXT_meshopt_compression'), l);
  }
});

test('each layer glb holds exactly the index meshes of that layer (female organs live in female.glb)', () => {
  for (const l of LAYERS) {
    const inGlb = meshNodeNames(glbJson(`${l}.glb`)).sort();
    const inIndex = Object.keys(index).filter((k) => index[k].layer === l && index[k].sex !== 'female').sort();
    assert.deepEqual(inGlb, inIndex, l);
  }
});

test('insertions.glb holds only origin/insertion meshes not in index', () => {
  const names = meshNodeNames(glbJson('insertions.glb'));
  assert.ok(names.length > 100);
  for (const n of names) {
    assert.match(n, /\.(ol|or|el|er)$/, n);
    assert.ok(!(n in index), n);
  }
});

test('model license also covers the icons rendered from the model', () => {
  const text = readFileSync(new URL('LICENSE.txt', MODEL), 'utf8');
  assert.match(text, /icons\//);
});

test('female.glb holds the six female organs, compressed, marked female in index', () => {
  const json = glbJson('female.glb');
  assert.ok((json.extensionsUsed || []).includes('EXT_meshopt_compression'));
  assert.deepEqual(meshNodeNames(json).sort(), [...FEMALE].sort());
  for (const n of FEMALE) assert.equal(index[n]?.sex, 'female', n);
});

test('male-only meshes are marked and count is as expected', () => {
  const male = Object.keys(index).filter((k) => index[k].sex === 'male');
  for (const n of ['Prostate', 'Testis.l', 'Urethra', 'Urinary bladder', 'Deep artery of penis.r']) assert.ok(male.includes(n), n);
  assert.ok(!male.includes('Kidney.l'));
});

test('license credits the Human Reference Atlas', () => {
  const text = readFileSync(new URL('LICENSE.txt', MODEL), 'utf8');
  assert.match(text, /HuBMAP CCF 3D Reference Object Library/);
});
