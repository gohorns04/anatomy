// 카메라 이동 계산 (three.js와 무관한 순수 함수)
const FILL = 0.6; // 가까이 보기: 물체가 화면 짧은 변의 60%를 차지
const NEAR_LIMIT = 0.25;
export const BODY_TOP = 1.85; // 발바닥(0)부터 머리 위까지 (m)

export function focusDistance(size, fovDeg, aspect) {
  const visibleHeight = size / FILL / Math.min(1, aspect);
  const d = visibleHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  return Math.max(NEAR_LIMIT, d);
}

// 시점 중심이 발바닥과 머리 위 사이에 머물게 한다.
export function clampTargetY(y) {
  return Math.min(BODY_TOP, Math.max(0, y));
}

// 세로 스크롤바: 몸 전체(머리=위, 발=아래) 중 지금 보이는 구간을 0~1 비율로
export function thumbFromView(targetY, visibleHeight) {
  const size = Math.min(1, visibleHeight / BODY_TOP);
  const viewTop = targetY + visibleHeight / 2;
  const start = Math.min(1 - size, Math.max(0, (BODY_TOP - viewTop) / BODY_TOP));
  return { start, size };
}

export function targetYFromThumb(start, visibleHeight) {
  return BODY_TOP - start * BODY_TOP - visibleHeight / 2;
}
