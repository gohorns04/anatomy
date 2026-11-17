"""Blender 헤드리스로 Z-Anatomy를 층별 glb로 내보낸다.

실행: blender -b .cache/zanatomy/Z-Anatomy/Startup.blend --python tools/export_layers.py
결과: .cache/build/raw/<layer>.glb, .cache/build/raw/insertions.glb, model/index.json
"""
import collections
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from zanat_rules import LAYERS, split_suffix, role, layer_for, group_for  # noqa: E402

ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, '.cache', 'build', 'raw')
os.makedirs(RAW, exist_ok=True)

CURVE_RESOLUTION_U = 4
CURVE_BEVEL_RESOLUTION = 2


def collection_ancestors(scene):
    parents = collections.defaultdict(set)

    def walk(col):
        for child in col.children:
            parents[child.name].add(col.name)
            walk(child)

    walk(scene.collection)
    return parents


def all_collection_names(obj, parents):
    seen = set()
    stack = [c.name for c in obj.users_collection]
    while stack:
        name = stack.pop()
        if name in seen:
            continue
        seen.add(name)
        stack.extend(parents.get(name, ()))
    return seen


def main():
    scene = bpy.context.scene
    parents = collection_ancestors(scene)
    sizes = {c.name: len(c.all_objects) for c in bpy.data.collections}

    plan = collections.defaultdict(list)  # bucket -> [(obj, name)]
    index = {}
    for obj in list(bpy.data.objects):
        r = role(obj.name, obj.type)
        if r == 'skip':
            continue
        if obj.type == 'MESH' and len(obj.data.polygons) == 0:
            continue
        cols = all_collection_names(obj, parents)
        if r in ('origin', 'insertion'):
            plan['insertions'].append((obj, obj.name))
            continue
        layer = layer_for(sorted(cols))
        if layer is None:
            continue
        base, side = split_suffix(obj.name)
        index[obj.name] = {'base': base, 'side': side, 'layer': layer, 'group': group_for(sorted(cols), sizes)}
        plan[layer].append((obj, obj.name))

    # 원본 이름을 비워 두어 복사본이 정확한 이름을 갖게 한다.
    for bucket in plan.values():
        for obj, _ in bucket:
            obj.name = '__orig__' + obj.name
            if obj.type == 'CURVE':
                obj.data.resolution_u = min(obj.data.resolution_u, CURVE_RESOLUTION_U)
                obj.data.bevel_resolution = min(obj.data.bevel_resolution, CURVE_BEVEL_RESOLUTION)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()

    for bucket, items in plan.items():
        export_col = bpy.data.collections.new('EXPORT_' + bucket)
        scene.collection.children.link(export_col)
        tris = 0
        for obj, name in items:
            evaluated = obj.evaluated_get(depsgraph)
            mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
            if len(mesh.polygons) == 0:  # 굵기 없는 곡선 등은 그릴 면이 없다
                bpy.data.meshes.remove(mesh)
                index.pop(name, None)
                print('SKIP empty', name)
                continue
            mesh.name = name
            copy = bpy.data.objects.new(name, mesh)
            copy.matrix_world = obj.matrix_world.copy()
            export_col.objects.link(copy)
            tris += sum(len(p.vertices) - 2 for p in mesh.polygons)
            if copy.name != name:
                raise RuntimeError(f'name collision: {name} -> {copy.name}')

        bpy.ops.object.select_all(action='DESELECT')
        for obj in export_col.objects:
            obj.select_set(True)
        out = os.path.join(RAW, bucket + '.glb')
        bpy.ops.export_scene.gltf(
            filepath=out,
            export_format='GLB',
            use_selection=True,
            export_materials='NONE',
            export_texcoords=False,
            export_normals=True,
            export_yup=True,
            export_apply=False,
            export_animations=False,
            export_skins=False,
            export_morph=False,
            export_cameras=False,
            export_lights=False,
        )
        print(f'EXPORT {bucket}: objects={len(items)} tris={tris} bytes={os.path.getsize(out)}')
        bpy.data.collections.remove(export_col)

    with open(os.path.join(ROOT, 'model', 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=0, sort_keys=True)
    counts = collections.Counter(v['layer'] for v in index.values())
    print('INDEX', len(index), dict(counts))


main()
