import bpy
import math
import os
from mathutils import Vector

SOURCE_ROOT = r"C:\Users\nicho\OneDrive\Documents\GitHub\Dark-Forest-Engine\Meshyai assets\extracted"
OUTPUT_ROOT = r"C:\Users\nicho\OneDrive\Documents\GitHub\Dark-Forest-Engine\Meshyai assets\catalog"
SHEET_SIZE = 4
CELL_SIZE = 5.0
IMAGE_SIZE = 1024

os.makedirs(OUTPUT_ROOT, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def collect_models():
    paths = []
    for root, _, files in os.walk(SOURCE_ROOT):
        for filename in files:
            if filename.lower().endswith('.glb'):
                paths.append(os.path.join(root, filename))
    return sorted(paths)


def import_model(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [obj for obj in bpy.data.objects if obj not in before]


def bounds(objects):
    points = []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        points.extend([obj.matrix_world @ Vector(corner) for corner in obj.bound_box])
    if not points:
        return Vector((-1, -1, -1)), Vector((1, 1, 1))
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return low, high


def add_label(text, x, y, z):
    curve = bpy.data.curves.new(f'label-{text}', 'FONT')
    curve.body = text[:28]
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = 0.22
    curve.extrude = 0.005
    obj = bpy.data.objects.new(f'label-{text}', curve)
    obj.location = (x, y, z)
    obj.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.collection.objects.link(obj)
    return obj


def configure_scene():
    world = bpy.context.scene.world
    world.color = (0.025, 0.03, 0.04)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = IMAGE_SIZE
    scene.render.resolution_y = IMAGE_SIZE
    scene.render.resolution_percentage = 100
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.studio_light = 'paint.sl'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = 'BOTH'
    camera_data = bpy.data.cameras.new('CatalogCamera')
    camera = bpy.data.objects.new('CatalogCamera', camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -22, 16)
    camera.rotation_euler = (math.radians(56), 0, 0)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = SHEET_SIZE * CELL_SIZE
    scene.camera = camera
    return camera


def main():
    model_paths = collect_models()
    manifest = []
    sheet_count = math.ceil(len(model_paths) / (SHEET_SIZE * SHEET_SIZE))
    for sheet_index in range(sheet_count):
        clear_scene()
        camera = configure_scene()
        sheet_paths = model_paths[sheet_index * SHEET_SIZE * SHEET_SIZE:(sheet_index + 1) * SHEET_SIZE * SHEET_SIZE]
        for index, path in enumerate(sheet_paths):
            row = index // SHEET_SIZE
            col = index % SHEET_SIZE
            cell_x = (col - (SHEET_SIZE - 1) / 2) * CELL_SIZE
            cell_y = (row - (SHEET_SIZE - 1) / 2) * CELL_SIZE
            imported = import_model(path)
            low, high = bounds(imported)
            center = (low + high) / 2
            span = max(high.x - low.x, high.y - low.y, high.z - low.z, 0.01)
            scale = 3.2 / span
            for obj in imported:
                obj.location -= center
                obj.scale *= scale
                obj.location.x += cell_x
                obj.location.y += cell_y
            folder = os.path.basename(os.path.dirname(path))
            add_label(folder, cell_x, cell_y - 1.8, 0)
            manifest.append({'source': path, 'folder': folder, 'sheet': sheet_index, 'cell': index})
        output = os.path.join(OUTPUT_ROOT, f'meshy-catalog-{sheet_index + 1:02d}.png')
        bpy.context.scene.render.filepath = output
        bpy.ops.render.render(write_still=True)
    with open(os.path.join(OUTPUT_ROOT, 'manifest.json'), 'w', encoding='utf-8') as handle:
        import json
        json.dump(manifest, handle, indent=2)
    print(f'CATALOG_COMPLETE {len(model_paths)} models {sheet_count} sheets')


main()
