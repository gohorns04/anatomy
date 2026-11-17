import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderInfo, escapeHtml } from '../js/info.js';

const index = {
  'Biceps.l': { base: 'Biceps', side: 'l', layer: 'muscle', group: 'Anterior compartment of arm' },
  'Femur.r': { base: 'Femur', side: 'r', layer: 'bone', group: 'Appendicular skeleton' },
  'Femoral artery.l': { base: 'Femoral artery', side: 'l', layer: 'vessel', group: 'Systemic arteries' },
  'Liver': { base: 'Liver', side: '', layer: 'organ', group: 'Digestive system' },
};
const content = {
  Biceps: { kind: 'muscle', name_ko: '위팔두갈래근', name_en: 'Biceps brachii', name_la: 'Musculus biceps brachii', summary: '팔꿈치를 굽혀요.',
    origin: '관절위결절', insertion: '노뼈거친면', action: '굽힘', innervation: '근육피부신경', fact: '두 갈래예요.' },
  Femur: { kind: 'bone', name_ko: '넙다리뼈', name_en: 'Femur', name_la: 'Os femoris', summary: '허벅지뼈', landmarks: '큰돌기', joints: '엉덩관절' },
  Liver: { kind: 'other', name_ko: '간', name_en: 'Liver', name_la: 'Hepar', summary: '해독', role: '쓸개즙을 만들어요.' },
};

test('muscle with content shows Korean name, terms and muscle table', () => {
  const html = renderInfo('Biceps.l', index, content);
  for (const s of ['위팔두갈래근', 'Biceps brachii', 'Musculus biceps brachii', '팔꿈치를 굽혀요.', '이는곳', '관절위결절', '닿는곳', '작용', '신경 지배', '근육피부신경', '두 갈래예요.', '왼쪽']) {
    assert.ok(html.includes(s), s);
  }
});

test('bone shows landmarks and joints; right side label', () => {
  const html = renderInfo('Femur.r', index, content);
  for (const s of ['주요 부위', '큰돌기', '관절', '엉덩관절', '오른쪽']) assert.ok(html.includes(s), s);
});

test('other kind shows role; midline mesh has no side label', () => {
  const html = renderInfo('Liver', index, content);
  assert.ok(html.includes('쓸개즙을 만들어요.'));
  assert.ok(!html.includes('왼쪽') && !html.includes('오른쪽'));
});

test('mesh without content shows English name, layer and group without placeholder text', () => {
  const html = renderInfo('Femoral artery.l', index, content);
  for (const s of ['Femoral artery', '혈관', 'Systemic arteries', '왼쪽']) assert.ok(html.includes(s), s);
  assert.ok(!html.includes('준비'));
});

test('text is escaped', () => {
  const evil = { ...content, Liver: { ...content.Liver, summary: '<b>&' } };
  const html = renderInfo('Liver', index, evil);
  assert.ok(html.includes('&lt;b&gt;&amp;'));
  assert.ok(!html.includes('<b>'));
  assert.equal(escapeHtml(`"'`), '&quot;&#39;');
});
