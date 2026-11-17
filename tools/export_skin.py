"""BodyParts3D 피부(FJ2810)를 Z-Anatomy 좌표계에 맞춰 skin.glb로 내보낸다.

실행: blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python tools/export_skin.py [-- --render]
기준: 마루뼈·발꿈치뼈의 경계 상자(크기·위치), 무릎뼈의 앞뒤 방향, 왼쪽 넙다리뼈의 좌우 방향.
"""
import json
import os
import re
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from align import fit_bbox, apply  # noqa: E402
REF_BP3D = ['left parietal bone', 'right parietal bone', 'left calcaneus', 'right calcaneus']
REF_ZANATOMY = ['Parietal bone.l', 'Parietal bone.r', 'Calcaneus.l', 'Calcaneus.r']

ROOT = os.path.dirname(HERE)
BP3D = os.path.join(ROOT, '.cache', 'bp3d', 'obj', 'partof_BP3D_4.0_obj_99')
RAW = os.path.join(ROOT, '.cache', 'build', 'raw')
SKIN_FJ = 'FJ2810'
BP3D_REF = {'femur.l': 'FJ3259', 'femur.r': 'FJ3365'}


def bp3d_bounds(fj):
    with open(os.path.join(BP3D, fj + '.obj'), errors='replace') as f:
        head = f.read(2000)
    m = re.search(r'Bounds\(mm\): \(([-\d.]+),([-\d.]+),([-\d.]+)\)-\(([-\d.]+),([-\d.]+),([-\d.]+)\)', head)
    v = [float(x) for x in m.groups()]
    return tuple(v[:3]), tuple(v[3:])


def bp3d_bounds_by_name(pattern):
    """partof_element_parts.txt에서 이름이 pattern과 정확히 같은 개념의 FJ 파일들의 경계 상자."""
    fjs = []
    with open(os.path.join(ROOT, '.cache', 'bp3d', 'partof_element_parts.txt')) as f:
        for line in f.read().splitlines()[1:]:
            _, name, fj = line.split('\t')
            if name == pattern:
                fjs.append(fj)
    boxes = [bp3d_bounds(fj) for fj in fjs]
    return union(boxes)


def union(boxes):
    lo = tuple(min(b[0][i] for b in boxes) for i in range(3))
    hi = tuple(max(b[1][i] for b in boxes) for i in range(3))
    return lo, hi


def center(box):
    return tuple((a + b) / 2 for a, b in zip(*box))


def world_box(name):
    obj = bpy.data.objects[name]
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return (tuple(min(p[i] for p in pts) for i in range(3)), tuple(max(p[i] for p in pts) for i in range(3)))


def sign(x):
    return 1 if x >= 0 else -1


def load_obj(path):
    verts, faces = [], []
    with open(path, errors='replace') as f:
        for line in f:
            if line.startswith('v '):
                verts.append(tuple(float(x) for x in line.split()[1:4]))
            elif line.startswith('f '):
                faces.append(tuple(int(t.split('/')[0]) - 1 for t in line.split()[1:]))
    return verts, faces


def main():
    # 좌우: BP3D와 Z-Anatomy에서 왼쪽 넙다리뼈가 x의 어느 쪽에 있는지
    bp_l, bp_r = bp3d_bounds(BP3D_REF['femur.l']), bp3d_bounds(BP3D_REF['femur.r'])
    za_l, za_r = world_box('Femur.l'), world_box('Femur.r')
    sx = sign(center(bp_l)[0] - center(bp_r)[0]) * sign(center(za_l)[0] - center(za_r)[0])
    # 앞뒤: 무릎뼈가 넙다리뼈보다 앞에 있다
    bp_pat = bp3d_bounds_by_name('left patella')
    za_pat = world_box('Patella.l')
    sy = sign(center(bp_pat)[1] - center(bp_l)[1]) * sign(center(za_pat)[1] - center(za_l)[1])
    axis_map = ((0, sx), (1, sy), (2, 1))

    # 크기·위치: 몸의 위아래 끝 뼈(마루뼈, 발꿈치뼈)의 합친 경계 상자끼리 맞춘다.
    # 넙다리뼈만 쓰면 키가 약 7% 커졌고, BP3D의 'skeletal system' 묶음은 몸통 위쪽만 포함한다.
    bp_ref = union([bp3d_bounds_by_name(n) for n in REF_BP3D])
    za_ref = union([world_box(n) for n in REF_ZANATOMY])
    print('REF bp3d', bp_ref, 'zanatomy', za_ref)
    scale, offset = fit_bbox(*bp_ref, *za_ref, axis_map)
    print('ALIGN axis_map', axis_map, 'scale', scale, 'offset', offset)

    verts, faces = load_obj(os.path.join(BP3D, SKIN_FJ + '.obj'))
    moved = [apply(v, scale, offset, axis_map) for v in verts]
    if sx * sy < 0:  # 축 하나를 뒤집으면 면의 감김 방향이 바뀐다
        faces = [tuple(reversed(f)) for f in faces]
    mesh = bpy.data.meshes.new('Skin')
    mesh.from_pydata(moved, [], faces)
    mesh.update()
    for p in mesh.polygons:
        p.use_smooth = True
    skin = bpy.data.objects.new('Skin', mesh)
    bpy.context.scene.collection.objects.link(skin)

    bpy.ops.object.select_all(action='DESELECT')
    skin.select_set(True)
    out = os.path.join(RAW, 'skin.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='NONE',
                              export_texcoords=False, export_normals=True, export_yup=True, export_animations=False)
    print('EXPORT skin: tris', sum(len(p.vertices) - 2 for p in mesh.polygons), 'bytes', os.path.getsize(out))

    index_path = os.path.join(ROOT, 'model', 'index.json')
    with open(index_path, encoding='utf-8') as f:
        index = json.load(f)
    index['Skin'] = {'base': 'Skin', 'side': '', 'layer': 'skin', 'group': 'Integument'}
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=0, sort_keys=True)

    if '--render' in sys.argv:
        render_check(skin)


def render_check(skin):
    """뼈 위에 반투명 피부를 겹쳐 앞·옆 이미지를 .cache/build/에 저장한다."""
    scene = bpy.context.scene
    for layer_col in bpy.context.view_layer.layer_collection.children:
        layer_col.hide_viewport = layer_col.name != '1: Skeletal system'
        layer_col.exclude = layer_col.name not in ('1: Skeletal system',)
    for obj in bpy.data.objects:
        obj.hide_render = obj.type != 'MESH' or not (obj.name == 'Skin' or obj.visible_get())
    skin.hide_render = False
    # 이 파일의 기본 Freestyle 선화로 그린다(헤드리스 Workbench는 빈 이미지가 나온다).
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.show_xray = True
    scene.display.shading.xray_alpha = 0.35
    scene.render.resolution_x, scene.render.resolution_y = 600, 1200
    pts = [skin.matrix_world @ v.co for v in list(skin.data.vertices)[::50]]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    mid, height = (lo + hi) / 2, hi.z - lo.z
    cam_data = bpy.data.cameras.new('CheckCam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = height * 1.1
    cam = bpy.data.objects.new('CheckCam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, direction, rot in (('front', Vector((0, -1, 0)), (1.5708, 0, 0)), ('side', Vector((1, 0, 0)), (1.5708, 0, 1.5708))):
        cam.location = mid + direction * height * 3
        cam.rotation_euler = rot
        scene.render.filepath = os.path.join(ROOT, '.cache', 'build', f'skin-check-{label}.png')
        bpy.ops.render.render(write_still=True)
        print('RENDER', scene.render.filepath)


main()
