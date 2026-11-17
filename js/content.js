// 한국어 내용(data/content.json) 검증과 조회.
// 키는 index의 base 이름이고, bases[]로 여러 메시(예: 이두근 장두·단두)를 한 항목에 묶는다.

const COMMON = ['name_ko', 'name_en', 'name_la', 'summary'];
const BY_KIND = {
  muscle: ['origin', 'insertion', 'action', 'innervation'],
  bone: ['landmarks', 'joints'],
  other: ['role'],
};

const filled = (v) => typeof v === 'string' && v.trim() !== '';

export function validateContent(content, index) {
  const known = new Set(Object.values(index).map((v) => v.base));
  const claimed = new Map();
  const errors = [];
  for (const [key, entry] of Object.entries(content)) {
    const required = BY_KIND[entry.kind];
    if (!required) errors.push(`${key}: unknown kind "${entry.kind}"`);
    for (const f of [...COMMON, ...(required ?? [])]) {
      if (!filled(entry[f])) errors.push(`${key}: missing ${f}`);
    }
    if (entry.fact !== undefined && !filled(entry.fact)) errors.push(`${key}: empty fact`);
    for (const base of [key, ...(entry.bases ?? [])]) {
      if (!known.has(base)) errors.push(`${key}: no mesh named "${base}"`);
      if (claimed.has(base)) errors.push(`${key}: "${base}" already used by ${claimed.get(base)}`);
      claimed.set(base, key);
    }
  }
  return errors;
}

const aliasCache = new WeakMap();
function aliases(content) {
  let map = aliasCache.get(content);
  if (!map) {
    map = new Map();
    for (const [key, entry] of Object.entries(content)) {
      map.set(key, entry);
      for (const b of entry.bases ?? []) map.set(b, entry);
    }
    aliasCache.set(content, map);
  }
  return map;
}

export function contentFor(meshName, index, content) {
  const info = index[meshName];
  if (!info) return null;
  return aliases(content).get(info.base) ?? null;
}
