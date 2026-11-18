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
