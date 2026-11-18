"""HRA(Human Reference Atlas) 여성 골반 장기를 Z-Anatomy 골반에 맞춰 female.glb로 내보낸다.

실행: blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python tools/export_female.py [-- --render]
기준: HRA 골반(볼기뼈 조각 + 엉치뼈) 경계 상자 → Z-Anatomy Hip bone.l/.r + Sacrum 경계 상자 (균일 스케일 + 이동)
"""
import json
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from align import fit_bbox, apply  # noqa: E402

ROOT = os.path.dirname(HERE)
HRA = os.path.join(ROOT, '.cache', 'hra')
RAW = os.path.join(ROOT, '.cache', 'build', 'raw')

# 내보낼 이름 → 원본 파일
ORGANS = {
    'Uterus': 'VH_F_Uterus',
    'Ovary.l': 'VH_F_Ovary_L',
    'Ovary.r': 'VH_F_Ovary_R',
    'Uterine tube.l': 'VH_F_Fallopian_Tube_L',
    'Uterine tube.r': 'VH_F_Fallopian_Tube_R',
    'Urinary bladder (female)': 'VH_F_Urinary_Bladder',
}
ZA_PELVIS = ['Hip bone.l', 'Hip bone.r', 'Sacrum']


def import_glb(stem):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HRA, stem + '.glb'))
    return [o for o in set(bpy.data.objects) - before if o.type == 'MESH']


def world_points(objs):
    for o in objs:
        m = o.matrix_world
        for v in o.data.vertices:
            yield m @ v.co


def box_of(points):
    pts = list(points)
    return (tuple(min(p[i] for p in pts) for i in range(3)), tuple(max(p[i] for p in pts) for i in range(3)))


def center(box):
    return tuple((a + b) / 2 for a, b in zip(*box))


def sign(x):
    return 1 if x >= 0 else -1


def main():
    pelvis = import_glb('VH_F_Pelvis')
    hip_l = [o for o in pelvis if o.name.endswith('_L')]
    hip_r = [o for o in pelvis if o.name.endswith('_R')]
    sacrum = [o for o in pelvis if 'sacrum' in o.name]
    ref = [o for o in pelvis if 'coccyx' not in o.name and 'spongy' not in o.name]
    hra_box = box_of(world_points(ref))

    za = [bpy.data.objects[n] for n in ZA_PELVIS]
    za_box = box_of(world_points(za))

    # 좌우: 왼쪽 볼기뼈가 x의 어느 쪽인지 / 앞뒤: 엉치뼈가 볼기뼈 중심보다 뒤에 있다
    sx = sign(center(box_of(world_points(hip_l)))[0] - center(box_of(world_points(hip_r)))[0]) \
        * sign(center(box_of(world_points([za[0]])))[0] - center(box_of(world_points([za[1]])))[0])
    hra_hips = box_of(world_points(hip_l + hip_r))
    za_hips = box_of(world_points(za[:2]))
    sy = sign(center(box_of(world_points(sacrum)))[1] - center(hra_hips)[1]) \
        * sign(center(box_of(world_points([za[2]])))[1] - center(za_hips)[1])
    axis_map = ((0, sx), (1, sy), (2, 1))
    # 여성 골반은 남성보다 낮고 넓다. 키 비율까지 평균하면 앞뒤가 커져 방광이 두덩뼈 앞으로 나와서, 좌우·앞뒤 비율로만 크기를 정한다.
    scale, offset = fit_bbox(*hra_box, *za_box, axis_map, scale_axes=(0, 1))
    print('ALIGN axis_map', axis_map, 'scale', round(scale, 4), 'offset', [round(v, 4) for v in offset])
    print('BOX hra', hra_box, 'za', za_box)
    for o in pelvis:
        bpy.data.objects.remove(o)

    flip = sx * sy < 0
    created = []
    for name, stem in ORGANS.items():
        parts = import_glb(stem)
        verts, faces = [], []
        for o in parts:
            base = len(verts)
            m = o.matrix_world
            verts.extend(apply(tuple(m @ v.co), scale, offset, axis_map) for v in o.data.vertices)
            for p in o.data.polygons:
                idx = [base + i for i in p.vertices]
                faces.append(tuple(reversed(idx)) if flip else tuple(idx))
            bpy.data.objects.remove(o)
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        for p in mesh.polygons:
            p.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        if obj.name != name:
            raise RuntimeError(f'name collision: {name} -> {obj.name}')
        created.append(obj)
        print('ORGAN', name, 'parts', len(parts), 'tris', sum(len(p.vertices) - 2 for p in mesh.polygons), 'box', box_of(world_points([obj])))

    bpy.ops.object.select_all(action='DESELECT')
    for o in created:
        o.select_set(True)
    out = os.path.join(RAW, 'female.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_materials='NONE',
                              export_texcoords=False, export_normals=True, export_yup=True, export_animations=False)
    print('EXPORT female bytes', os.path.getsize(out))

    index_path = os.path.join(ROOT, 'model', 'index.json')
    with open(index_path, encoding='utf-8') as f:
        index = json.load(f)
    for name in ORGANS:
        base, _, side = name.partition('.')
        index[name] = {'base': base, 'side': side, 'layer': 'organ', 'group': 'Female genital organs', 'sex': 'female'}
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=0, sort_keys=True)

    if '--render' in sys.argv:
        render_check(created, za)


def render_check(created, za):
    scene = bpy.context.scene
    for lc in bpy.context.view_layer.layer_collection.children:
        lc.exclude = lc.name != '1: Skeletal system'
    keep = set(created) | set(za)
    for obj in bpy.data.objects:
        obj.hide_render = obj not in keep
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = scene.render.resolution_y = 700
    box = box_of(world_points(za))
    mid = Vector(center(box))
    size = max(b - a for a, b in zip(*box))
    cam = bpy.data.objects.new('CheckCam', bpy.data.cameras.new('CheckCam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = size * 1.3
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, direction, rot in (('front', Vector((0, -1, 0)), (1.5708, 0, 0)), ('side', Vector((1, 0, 0)), (1.5708, 0, 1.5708))):
        cam.location = mid + direction * 2
        cam.rotation_euler = rot
        scene.render.filepath = os.path.join(ROOT, '.cache', 'build', f'female-check-{label}.png')
        bpy.ops.render.render(write_still=True)


main()
