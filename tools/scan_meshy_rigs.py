import bpy
import os

SOURCE_ROOT = r"C:\Users\nicho\OneDrive\Documents\GitHub\Dark-Forest-Engine\Meshyai assets\extracted"

paths = []
for root, _, files in os.walk(SOURCE_ROOT):
    for filename in files:
        if filename.lower().endswith('.glb'):
            paths.append(os.path.join(root, filename))

for path in sorted(paths):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    armatures = [obj for obj in imported if obj.type == 'ARMATURE']
    meshes = [obj for obj in imported if obj.type == 'MESH']
    actions = list(bpy.data.actions)
    folder = os.path.basename(os.path.dirname(path))
    print(f'RIG_SCAN {folder} armatures={len(armatures)} meshes={len(meshes)} actions={len(actions)}')
