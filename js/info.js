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
