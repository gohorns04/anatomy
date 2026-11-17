"""Z-Anatomy 객체를 층·역할·묶음으로 나누는 순수 규칙 (bpy 없이 테스트 가능)."""
import re

LAYERS = ['skin', 'muscle', 'bone', 'organ', 'vessel', 'nerve']

# 최상위 컬렉션 → 층. 표 순서가 우선순위다(앞선 층이 이긴다).
TOP_LEVEL = [
    ('4: Muscular system', 'muscle'),
    ('1: Skeletal system', 'bone'),
    ('3: Joints', 'bone'),
    ('8: Visceral systems', 'organ'),
    ('6: Lymphoid organs', 'organ'),
    ('5: Cardiovascular system', 'vessel'),
    ('7: Nervous system & Sense organs', 'nerve'),
]
LAYER_ORDER = {layer: i for i, layer in enumerate(LAYERS)}

_SUFFIX = re.compile(r'^(.*)\.([a-z]{1,2})$')
_TOP = re.compile(r'^\d+: ')
_SIDE_GROUP = re.compile(r'^(Left|Right) ')


def split_suffix(name):
    name = name.strip()
    m = _SUFFIX.match(name)
    base, suffix = (m.group(1), m.group(2)) if m else (name, '')
    base = base.strip()
    if base.startswith('(') and base.endswith(')'):
        base = base[1:-1].strip()
    return base, suffix


# 전체 메시와 표면이 겹치는 하위 조각 (측정: 간 구역 조각은 꼭짓점의 44~67%가 간 표면과 일치)
EXCLUDE = [re.compile(r'segment of liver')]


def role(name, obj_type):
    if obj_type not in ('MESH', 'CURVE'):
        return 'skip'
    base, suffix = split_suffix(name)
    if any(p.search(base) for p in EXCLUDE):
        return 'skip'
    if suffix in ('', 'l', 'r'):
        return 'display'
    if suffix in ('ol', 'or'):
        return 'origin'
    if suffix in ('el', 'er'):
        return 'insertion'
    return 'skip'


def layer_for(collections):
    names = set(collections)
    found = [layer for top, layer in TOP_LEVEL if top in names]
    if not found:
        return None
    if 'vessel' in found and 'Heart' in names:
        found = [l if l != 'vessel' else 'organ' for l in found]
    return min(found, key=lambda l: LAYER_ORDER[l])


def group_for(collections, sizes):
    candidates = [c for c in collections if not _TOP.match(c) and not _SIDE_GROUP.match(c)]
    if candidates:
        return min(candidates, key=lambda c: (sizes.get(c, 10**9), c))
    tops = [c for c in collections if _TOP.match(c)]
    return _TOP.sub('', tops[0]) if tops else ''
