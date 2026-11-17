"""앱 아이콘(icons/icon-512.png)을 근육층 정면 상반신으로 렌더한다.

실행: blender -b --factory-startup --python tools/render_icon.py
"""
import os

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'icons', 'icon-512.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def material(name, rgb, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes['Principled BSDF']
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = roughness
    return mat


def import_layer(layer, mat):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, '.cache', 'build', 'raw', layer + '.glb'))
    for obj in set(bpy.data.objects) - before:
        if obj.type == 'MESH':
            obj.data.materials.clear()
            obj.data.materials.append(mat)


# 앱의 층 색(근육 #A8473C, 뼈 #E9DFC8)을 선형 색공간으로 근사
import_layer('muscle', material('muscle', (0.39, 0.06, 0.045), 0.55))
import_layer('bone', material('bone', (0.82, 0.74, 0.58), 0.75))

world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.86, 0.88, 0.91, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
scene.world = world

sun = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (0.9, 0.2, 0.5)
scene.collection.objects.link(sun)
rim = bpy.data.objects.new('rim', bpy.data.lights.new('rim', 'SUN'))
rim.data.energy = 1.5
rim.rotation_euler = (1.2, 0, 3.4)
scene.collection.objects.link(rim)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 0.78
cam.location = Vector((0, -3, 1.36))
cam.rotation_euler = (1.5708, 0, 0)
scene.collection.objects.link(cam)
scene.camera = cam

scene.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items} else 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('ICON', OUT, scene.render.engine)
