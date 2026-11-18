// 가로 단면: clipY보다 위쪽은 잘려 나가 선택 대상이 아니다.
export function belowClip(y, clipY) {
  return clipY == null || y <= clipY;
}
