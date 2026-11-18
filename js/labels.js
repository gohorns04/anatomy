// 이름표 배치: 화면 중앙에 가까운 것부터 놓고, 이미 놓인 것과 겹치면 건너뛴다.
// cand: { mesh, x, y (중심, px), w, h, dist (화면 중앙까지 거리) }
export function placeLabels(cands, max = 24) {
  const placed = [];
  for (const c of [...cands].sort((a, b) => a.dist - b.dist)) {
    if (placed.length >= max) break;
    const overlaps = placed.some((p) => Math.abs(p.x - c.x) < (p.w + c.w) / 2 && Math.abs(p.y - c.y) < (p.h + c.h) / 2);
    if (!overlaps) placed.push(c);
  }
  return placed.map((p) => p.mesh);
}
