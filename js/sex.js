// 남/여 모드에서 보이는 메시와, 다른 성별 구조물로 이동할 때의 처리
export function visibleForSex(info, sex) {
  return Boolean(info) && (!info.sex || info.sex === sex);
}

// 여성 모드에서는 피부층을 쓰지 않는다(현재 피부 메시가 남성형이라서).
export function skinAllowed(sex) {
  return sex === 'male';
}

export function resolveTarget(meshName, index, { sex, layers }) {
  const info = index[meshName];
  return {
    sex: info?.sex ?? sex,
    layersToTurnOn: info && layers[info.layer] !== 'on' ? [info.layer] : [],
  };
}
