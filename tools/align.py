"""두 좌표계의 경계 상자를 맞추는 균일 스케일 + 이동 (순수 함수).

axis_map: 대상 축 i마다 (원본 축 번호, 부호). 대상[i] = 부호 * 원본[원본 축].
"""


def _permute(p, axis_map):
    return tuple(sign * p[src] for src, sign in axis_map)


def _box(p_min, p_max, axis_map):
    a, b = _permute(p_min, axis_map), _permute(p_max, axis_map)
    return tuple(min(x, y) for x, y in zip(a, b)), tuple(max(x, y) for x, y in zip(a, b))


def fit_bbox(src_min, src_max, dst_min, dst_max, axis_map, scale_axes=(0, 1, 2)):
    s_lo, s_hi = _box(src_min, src_max, axis_map)
    ratios = [(dh - dl) / (sh - sl) for sl, sh, dl, dh in zip(s_lo, s_hi, dst_min, dst_max)]
    scale = sum(ratios[i] for i in scale_axes) / len(scale_axes)
    offset = tuple((dl + dh) / 2 - scale * (sl + sh) / 2 for sl, sh, dl, dh in zip(s_lo, s_hi, dst_min, dst_max))
    return scale, offset


def apply(point, scale, offset, axis_map):
    return tuple(scale * v + o for v, o in zip(_permute(point, axis_map), offset))
