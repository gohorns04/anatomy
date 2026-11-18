// 선택한 구조물과 연결된 구조물 목록
import { contentFor } from './content.js';

const SIDE = /\.([lr])$/;

function meshFor(base, side, byBase) {
  const names = byBase.get(base) ?? [];
  return names.find((n) => n.endsWith(`.${side}`)) ?? names.find((n) => !SIDE.test(n)) ?? names.find((n) => n.endsWith('.r')) ?? names[0];
}

function titleFor(mesh, index, content) {
  return contentFor(mesh, index, content)?.name_ko ?? index[mesh]?.base ?? mesh;
}

// 같은 내용 항목에 묶인 다른 base 중 지금 성별에서 보이는 것으로 바꾼다(예: 방광 → 여성 방광).
function forSex(base, sex, index, content, byBase) {
  const names = byBase.get(base) ?? [];
  if (!names.length || names.some((n) => !index[n].sex || index[n].sex === sex)) return base;
  const entry = contentFor(names[0], index, content);
  if (!entry) return base;
  const keyOf = Object.entries(content).find(([, e]) => e === entry)?.[0];
  const alt = [keyOf, ...(entry.bases ?? [])].find((b) => (byBase.get(b) ?? []).some((n) => !index[n].sex || index[n].sex === sex));
  return alt ?? base;
}

export function relatedFor(meshName, index, content, { sex = 'male' } = {}) {
  const info = index[meshName];
  if (!info) return [];
  const side = info.side || 'r';
  const byBase = new Map();
  for (const name of Object.keys(index)) {
    const b = index[name].base;
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(name);
  }
  const entry = contentFor(meshName, index, content);
  if (entry?.related?.length) {
    return entry.related.map((r) => ({
      type: r.type,
      items: [...new Set(r.bases.map((b) => forSex(b, sex, index, content, byBase)))]
        .map((b) => meshFor(b, side, byBase)).filter(Boolean).map((mesh) => ({ mesh, title: titleFor(mesh, index, content) })),
    })).filter((g) => g.items.length);
  }
  const siblings = [...byBase.keys()]
    .filter((b) => b !== info.base && byBase.get(b).some((n) => index[n].group === info.group && index[n].layer === info.layer))
    .slice(0, 8)
    .map((b) => meshFor(b, side, byBase))
    .map((mesh) => ({ mesh, title: titleFor(mesh, index, content) }));
  return siblings.length ? [{ type: '같은 부위', items: siblings }] : [];
}
