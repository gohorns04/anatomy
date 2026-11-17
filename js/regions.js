// 몸 그림 좌표. viewBox 200 x 500, 몸 중심선 x = 100.
// 좌우 한 쌍인 부위는 오른쪽(화면 기준)을 정의하고 mirror로 왼쪽을 만든다.

export const VIEWBOX = '0 0 200 500';

const K = 0.5523; // 원을 베지어 4개로 근사할 때의 상수
const r = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${r(x)} ${r(y)}`;

function poly(points) {
  return `M ${points.map(pt).join(' L ')} Z`;
}

function ellipse(cx, cy, rx, ry) {
  const kx = rx * K;
  const ky = ry * K;
  return [
    `M ${pt([cx, cy - ry])}`,
    `C ${pt([cx + kx, cy - ry])} ${pt([cx + rx, cy - ky])} ${pt([cx + rx, cy])}`,
    `C ${pt([cx + rx, cy + ky])} ${pt([cx + kx, cy + ry])} ${pt([cx, cy + ry])}`,
    `C ${pt([cx - kx, cy + ry])} ${pt([cx - rx, cy + ky])} ${pt([cx - rx, cy])}`,
    `C ${pt([cx - rx, cy - ky])} ${pt([cx - kx, cy - ry])} ${pt([cx, cy - ry])}`,
    'Z',
  ].join(' ');
}

const flip = (points) => points.map(([x, y]) => [200 - x, y]);

// 한 쌍: [오른쪽, 왼쪽] 경로
const pairPoly = (points) => [poly(points), poly(flip(points))];
const pairEllipse = (cx, cy, rx, ry) => [ellipse(cx, cy, rx, ry), ellipse(200 - cx, cy, rx, ry)];

// 몸 윤곽 (화면 오른쪽 절반, 목에서 시작해 바깥쪽을 따라 아래로, 안쪽으로 올라와 다리까지)
const RIGHT_OUTLINE = [
  [110, 58], [111, 80], [128, 86], [146, 92], [156, 108], [160, 150], [164, 190],
  [170, 240], [172, 278], [176, 300], [172, 326], [160, 322], [156, 296], [155, 278],
  [150, 232], [146, 192], [142, 150], [136, 124], [134, 170], [130, 205], [138, 250],
  [138, 300], [134, 360], [130, 400], [124, 450], [130, 472], [128, 484], [106, 484],
  [108, 456], [106, 400], [104, 360], [102, 300], [100, 268],
];

const bodyOutline = poly([
  ...RIGHT_OUTLINE,
  ...flip(RIGHT_OUTLINE.slice(0, -1)).reverse(),
]);
const head = ellipse(100, 38, 22, 28);
const silhouette = `${head} ${bodyOutline}`;

export const SILHOUETTE = { front: silhouette, back: silhouette };

const deltoid = pairPoly([[128, 86], [146, 92], [156, 108], [158, 128], [148, 136], [140, 118], [132, 100]]);
const upperArmMuscle = pairEllipse(152, 162, 7, 24);
const skull = [ellipse(100, 36, 20, 25)];
const ribs = pairPoly([[106, 98], [128, 100], [134, 130], [130, 175], [110, 185], [106, 150]]);
const humerus = pairPoly([[147, 104], [153, 104], [156, 186], [150, 186]]);
const ulna = pairPoly([[150, 196], [154, 196], [159, 274], [155, 274]]);
const handBones = pairEllipse(165, 302, 9, 18);
const pelvis = [poly([[72, 232], [100, 240], [128, 232], [134, 252], [118, 272], [100, 276], [82, 272], [66, 252]])];
const femur = pairPoly([[120, 256], [127, 258], [122, 354], [116, 354]]);
const fibula = pairPoly([[122, 376], [126, 376], [124, 450], [121, 450]]);
const footBones = pairPoly([[110, 458], [124, 456], [130, 474], [128, 482], [108, 482]]);

export const REGIONS = {
  // 근육
  deltoid: { front: deltoid, back: deltoid },
  'pectoralis-major': { front: pairPoly([[102, 96], [128, 92], [140, 112], [138, 126], [124, 134], [104, 132]]) },
  'biceps-brachii': { front: upperArmMuscle },
  'triceps-brachii': { back: upperArmMuscle },
  'forearm-flexors': { front: pairEllipse(158, 232, 7, 32) },
  'rectus-abdominis': { front: [poly([[87, 138], [113, 138], [114, 230], [100, 242], [86, 230]])] },
  'external-oblique': { front: pairPoly([[118, 140], [134, 150], [131, 205], [136, 240], [118, 232]]) },
  quadriceps: { front: pairPoly([[106, 268], [132, 262], [136, 300], [130, 350], [112, 352], [104, 300]]) },
  'tibialis-anterior': { front: pairPoly([[120, 372], [128, 374], [126, 440], [120, 440]]) },
  sternocleidomastoid: { front: pairPoly([[104, 60], [110, 62], [104, 84], [100, 84]]) },
  trapezius: {
    back: [poly([[100, 56], [112, 80], [146, 92], [124, 104], [108, 140], [100, 170], [92, 140], [76, 104], [54, 92], [88, 80]])],
  },
  'latissimus-dorsi': { back: pairPoly([[108, 142], [124, 108], [136, 128], [134, 170], [130, 205], [110, 215]]) },
  'gluteus-maximus': { back: pairEllipse(119, 262, 17, 18) },
  hamstrings: { back: pairPoly([[106, 284], [134, 282], [134, 350], [108, 352]]) },
  gastrocnemius: { back: pairEllipse(118, 395, 10, 26) },

  // 뼈
  skull: { front: skull, back: skull },
  clavicle: { front: pairPoly([[103, 86], [128, 84], [144, 90], [142, 94], [128, 89], [103, 91]]) },
  scapula: { back: pairPoly([[110, 100], [136, 100], [116, 150]]) },
  sternum: { front: [poly([[96, 92], [104, 92], [105, 140], [100, 150], [95, 140]])] },
  ribs: { front: ribs, back: ribs },
  'vertebral-column': { back: [poly([[97, 62], [103, 62], [103, 250], [100, 262], [97, 250]])] },
  humerus: { front: humerus, back: humerus },
  radius: { front: pairPoly([[157, 196], [161, 196], [167, 274], [163, 274]]) },
  ulna: { front: ulna, back: ulna },
  'hand-bones': { front: handBones, back: handBones },
  pelvis: { front: pelvis, back: pelvis },
  femur: { front: femur, back: femur },
  patella: { front: pairEllipse(118, 362, 6, 7) },
  tibia: { front: pairPoly([[110, 372], [118, 372], [116, 452], [111, 452]]) },
  fibula: { front: fibula, back: fibula },
  'foot-bones': { front: footBones, back: footBones },
};
