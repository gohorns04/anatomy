// 성공한 결과는 재사용하고, 실패하면 다음 호출에서 다시 시도한다.
export function onceUntilSuccess(fn) {
  let pending = null;
  return () => {
    pending ??= fn().catch((err) => {
      pending = null;
      throw err;
    });
    return pending;
  };
}

// 가장 최근 요청만 유효하게: 이동(goTo)처럼 늦게 끝난 이전 요청이 새 선택을 덮지 않게 한다.
export function createSequence() {
  let current = 0;
  return { next: () => ++current, isCurrent: (token) => token === current };
}
