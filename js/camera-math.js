// 카메라 이동 계산 (three.js와 무관한 순수 함수)
const FILL = 0.6; // 가까이 보기: 물체가 화면 짧은 변의 60%를 차지
const NEAR_LIMIT = 0.25;

export function focusDistance(size, fovDeg, aspect) {
  const visibleHeight = size / FILL / Math.min(1, aspect);
  const d = visibleHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  return Math.max(NEAR_LIMIT, d);
}

// 휠을 아래로 굴리면(deltaY > 0) 시점이 몸 아래쪽으로 내려간다. 멀리 있을수록 크게 움직인다.
export function scrollPanAmount(deltaY, distance) {
  return -deltaY * distance * 0.0012;
}

// 시점 중심이 발바닥(0)과 머리 위(1.85) 사이에 머물게 한다.
export function clampTargetY(y) {
  return Math.min(1.85, Math.max(0, y));
}
