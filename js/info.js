// 선택한 구조물의 정보 시트 HTML
import { contentFor } from './content.js';
import { LAYERS } from './layers.js';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

const SIDE = { l: '왼쪽', r: '오른쪽' };
const ROWS = {
  muscle: [['origin', '이는곳'], ['insertion', '닿는곳'], ['action', '작용'], ['innervation', '신경 지배']],
  bone: [['landmarks', '주요 부위'], ['joints', '관절']],
  other: [['role', '하는 일과 위치']],
};

const layerLabel = (id) => LAYERS.find((l) => l.id === id)?.label ?? '';

function meta(info) {
  const parts = [layerLabel(info.layer), SIDE[info.side]].filter(Boolean);
  return `<p class="info-meta">${parts.map((p) => `<span>${escapeHtml(p)}</span>`).join('')}</p>`;
}

function table(rows) {
  return `<dl class="info-table">${rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('')}</dl>`;
}

export function renderInfo(meshName, index, content) {
  const info = index[meshName];
  if (!info) return '';
  const entry = contentFor(meshName, index, content);
  if (!entry) {
    return `${meta(info)}
      <h2 class="info-title" id="info-title" lang="en">${escapeHtml(info.base)}</h2>
      ${table([['속한 부위', info.group]])}`;
  }
  const rows = ROWS[entry.kind].map(([field, label]) => [label, entry[field]]);
  const fact = entry.fact
    ? `<div class="info-fact"><span class="info-fact-label">알고 계셨나요?</span><p>${escapeHtml(entry.fact)}</p></div>`
    : '';
  return `${meta(info)}
    <h2 class="info-title" id="info-title">${escapeHtml(entry.name_ko)}</h2>
    <p class="info-terms"><span lang="en">${escapeHtml(entry.name_en)}</span><i lang="la">${escapeHtml(entry.name_la)}</i></p>
    <p class="info-summary">${escapeHtml(entry.summary)}</p>
    ${table(rows)}
    ${fact}`;
}

// 넓은 화면의 오른쪽 패널에 아무것도 선택하지 않았을 때 보이는 안내
export function renderEmpty() {
  return `<h2 class="info-title" id="info-title">몸 탐험</h2>
    <p class="info-summary">구조물을 누르면 이름과 설명이 여기에 나와요.</p>
    <dl class="info-table">
      <div><dt>돌리기</dt><dd>한 손가락(마우스)으로 끌어요.</dd></div>
      <div><dt>확대</dt><dd>마우스 휠을 굴리거나 두 손가락으로 벌려요.</dd></div>
      <div><dt>위아래 이동</dt><dd>확대하면 나타나는 오른쪽 세로 막대를 끌어요.</dd></div>
      <div><dt>가까이 보기</dt><dd>구조물을 고른 뒤 "가까이 보기"를 눌러요.</dd></div>
      <div><dt>층</dt><dd>위의 버튼을 누를 때마다 켬 → 반투명 → 끔으로 바뀌어요.</dd></div>
      <div><dt>처음 시점</dt><dd>빈 곳을 두 번 탭해요.</dd></div>
    </dl>`;
}
