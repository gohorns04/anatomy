import { partsForView } from './model.js';
import { REGIONS, SILHOUETTE, VIEWBOX } from './regions.js';
import { escapeHtml } from './sheet.js';

// 경로들의 경계 상자 넓이. 큰 부위를 먼저 그려서 작은 부위가 위에 오게(눌리게) 한다.
function area(paths) {
  const nums = paths.join(' ').match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  // 좌우 한 쌍은 경로 하나 기준으로 비교
  return (w * h) / paths.length;
}

export function renderBody(parts, system, side, selectedId) {
  const visible = partsForView(parts, system, side)
    .map((p) => ({ part: p, paths: REGIONS[p.id][side] }))
    .sort((a, b) => area(b.paths) - area(a.paths));

  const groups = visible.map(({ part, paths }) => {
    const cls = part.id === selectedId ? 'part selected' : 'part';
    const name = escapeHtml(part.name_ko);
    const shapes = paths.map((d) => `<path d="${d}"/>`).join('');
    return `<g class="${cls}" data-part-id="${part.id}" role="button" tabindex="0" aria-label="${name}"><title>${name}</title>${shapes}</g>`;
  });

  return `<svg viewBox="${VIEWBOX}" xmlns="http://www.w3.org/2000/svg" class="body body-${system}">`
    + `<path class="silhouette" d="${SILHOUETTE[side]}"/>`
    + groups.join('')
    + '</svg>';
}
