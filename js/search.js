// 이름 검색: 한국어(괄호 속 한자어 포함)·영어·라틴어·메시 이름, 한글 초성

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export function toChoseong(s) {
  return [...s].map((ch) => {
    const code = ch.charCodeAt(0) - 0xac00;
    return code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch;
  }).join('');
}
const isChoseong = (s) => /^[ㄱ-ㅎ]+$/.test(s);
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// 같은 base의 대표 메시: 오른쪽 > 가운데 > 왼쪽
function representative(base, byBase) {
  const names = byBase.get(base) ?? [];
  return names.find((n) => n.endsWith('.r')) ?? names.find((n) => !/\.[lr]$/.test(n)) ?? names[0];
}

function score(fields, q, qCho) {
  let best = Infinity;
  for (const f of fields) {
    const v = norm(f);
    if (v === q) best = Math.min(best, 0);
    else if (v.startsWith(q)) best = Math.min(best, 1);
    else if (v.includes(q)) best = Math.min(best, 2);
    if (qCho) {
      const c = toChoseong(f.replace(/\s+/g, ''));
      if (c.startsWith(qCho)) best = Math.min(best, 1);
      else if (c.includes(qCho)) best = Math.min(best, 2);
    }
  }
  return best;
}

export function search(query, index, content, { limit = 20 } = {}) {
  const q = norm(query);
  if (!q) return [];
  const qCho = isChoseong(q.replace(/\s/g, '')) ? q.replace(/\s/g, '') : null;
  const byBase = new Map();
  for (const name of Object.keys(index)) {
    const b = index[name].base;
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(name);
  }

  const results = [];
  const covered = new Set();
  for (const [key, entry] of Object.entries(content)) {
    for (const b of [key, ...(entry.bases ?? [])]) covered.add(b);
    const mesh = representative(key, byBase);
    if (!mesh) continue;
    const ko = entry.name_ko;
    const parts = [ko, ...ko.split(/[()]/).map((s) => s.trim()).filter(Boolean), entry.name_en, entry.name_la, key];
    const s = score(parts, q, qCho);
    if (s < Infinity) results.push({ mesh, title: ko, subtitle: entry.name_en, rank: s });
  }
  for (const [base] of byBase) {
    if (covered.has(base)) continue;
    const s = score([base], q, null);
    if (s < Infinity) results.push({ mesh: representative(base, byBase), title: base, subtitle: '', rank: s + 10 });
  }
  results.sort((a, b) => a.rank - b.rank || a.title.length - b.title.length || a.title.localeCompare(b.title));
  return results.slice(0, limit).map(({ rank, ...r }) => r);
}
