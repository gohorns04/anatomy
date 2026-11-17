// 한 번 탭과 두 번 탭 구분. 한 번 탭은 두 번 탭 대기 시간이 지나야 확정된다.
export function createTapHandler({ onSingle, onDouble, delay = 300, slop = 30, setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout }) {
  let pending = null; // { x, y, timer }
  return function tap(x, y) {
    if (pending && Math.hypot(x - pending.x, y - pending.y) <= slop) {
      clearTimeout(pending.timer);
      pending = null;
      onDouble();
      return;
    }
    if (pending) {
      clearTimeout(pending.timer);
      const prev = pending;
      pending = null;
      onSingle(prev.x, prev.y);
    }
    const p = { x, y };
    p.timer = setTimeout(() => { if (pending === p) pending = null; onSingle(x, y); }, delay);
    pending = p;
  };
}
