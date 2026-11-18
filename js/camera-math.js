// 카메라 이동 계산 (three.js와 무관한 순수 함수)
const FILL = 0.6; // 가까이 보기: 물체가 화면 짧은 변의 60%를 차지
const NEAR_LIMIT = 0.25;

export function focusDistance(size, fovDeg, aspect) {
  const visibleHeight = size / FILL / Math.min(1, aspect);
  const d = visibleHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  return Math.max(NEAR_LIMIT, d);
}
