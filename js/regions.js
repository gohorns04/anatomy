// 부위 바로가기 시점 (glTF 좌표: y 위, +z 앞, +x 몸의 왼쪽). target: 바라보는 점, dir: 점에서 카메라 쪽 방향
const n = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };

export const REGION_PRESETS = [
  { id: 'head', label: '머리', target: [0, 1.6, 0.01], distance: 0.65, dir: n(0, 0, 1) },
  { id: 'neck', label: '목', target: [0, 1.45, 0], distance: 0.5, dir: n(0, 0.05, 1) },
  { id: 'chest', label: '가슴', target: [0, 1.28, 0], distance: 0.85, dir: n(0, 0, 1) },
  { id: 'abdomen', label: '배', target: [0, 1.05, 0], distance: 0.8, dir: n(0, 0, 1) },
  { id: 'pelvis', label: '골반', target: [0, 0.9, 0], distance: 0.7, dir: n(0, 0.1, 1) },
  { id: 'arm', label: '팔', target: [-0.25, 1.12, 0], distance: 1.1, dir: n(-0.25, 0, 1) },
  { id: 'hand', label: '손', target: [-0.33, 0.78, 0.02], distance: 0.45, dir: n(-0.2, 0, 1) },
  { id: 'leg', label: '다리', target: [0, 0.5, 0], distance: 1.3, dir: n(0, 0, 1) },
  { id: 'foot', label: '발', target: [0, 0.06, 0.05], distance: 0.6, dir: n(0, 0.45, 1) },
  { id: 'back', label: '등', target: [0, 1.2, 0], distance: 1.6, dir: n(0, 0, -1) },
];
