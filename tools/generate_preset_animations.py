import bpy
import math
import os
from mathutils import Euler

SOURCE_ROOT = r"C:\Users\nicho\OneDrive\Documents\GitHub\Dark-Forest-Engine\Meshyai assets\extracted"
OUTPUT_ROOT = r"C:\Users\nicho\OneDrive\Documents\GitHub\Dark-Forest-Engine\Meshyai assets\animated"
FPS = 30

os.makedirs(OUTPUT_ROOT, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def find_bones(armature):
    result = {}
    for bone in armature.data.bones:
        name = bone.name.lower().replace('_', '').replace('-', '').replace(' ', '')
        for role, tokens in {
            'root': ['root', 'hips', 'pelvis'],
            'spine': ['spine', 'chest', 'upperbody'],
            'head': ['head', 'neck'],
            'left_arm': ['leftarm', 'arm_l', 'upperarm.l', 'lupperarm', 'leftshoulder'],
            'right_arm': ['rightarm', 'arm_r', 'upperarm.r', 'rupperarm', 'rightshoulder'],
            'left_hand': ['lefthand', 'hand_l', 'wrist.l', 'lwrist'],
            'right_hand': ['righthand', 'hand_r', 'wrist.r', 'rwrist'],
            'left_leg': ['leftleg', 'leg_l', 'thigh.l', 'lthigh'],
            'right_leg': ['rightleg', 'leg_r', 'thigh.r', 'rthigh'],
            'left_foot': ['leftfoot', 'foot_l', 'lfoot'],
            'right_foot': ['rightfoot', 'foot_r', 'rfoot']
        }.items():
            if any(token.replace('.', '') in name for token in tokens):
                result.setdefault(role, bone.name)
    return result


def set_pose(armature, bones, frame, rotations=None, locations=None):
    rotations = rotations or {}
    locations = locations or {}
    bpy.context.scene.frame_set(frame)
    for role, rotation in rotations.items():
        bone_name = bones.get(role)
        if not bone_name:
            continue
        pose_bone = armature.pose.bones.get(bone_name)
        if pose_bone:
            pose_bone.rotation_mode = 'XYZ'
            pose_bone.rotation_euler = Euler(rotation, 'XYZ')
            pose_bone.keyframe_insert('rotation_euler', frame=frame, group=role)
    for role, location in locations.items():
        bone_name = bones.get(role)
        if not bone_name:
            continue
        pose_bone = armature.pose.bones.get(bone_name)
        if pose_bone:
            pose_bone.location = location
            pose_bone.keyframe_insert('location', frame=frame, group=role)


def create_action(armature, bones, name, frames):
    action = bpy.data.actions.new(name)
    armature.animation_data_create()
    armature.animation_data.action = action
    for frame, rotations, locations in frames:
        set_pose(armature, bones, frame, rotations, locations)
    for curve in action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'BEZIER'
    return action


def make_actions(armature):
    bones = find_bones(armature)
    if not bones.get('root') and not bones.get('spine'):
        print(f'ANIMATION_SKIP {armature.name} no humanoid bone names detected')
        return []
    actions = []
    neutral = ({}, {})
    actions.append(create_action(armature, bones, 'Idle', [(1, *neutral), (30, *neutral), (60, *neutral)]))
    actions.append(create_action(armature, bones, 'Walk', [
        (1, {'left_leg': (0.45, 0, 0), 'right_leg': (-0.45, 0, 0), 'left_arm': (-0.35, 0, 0), 'right_arm': (0.35, 0, 0)}, {}),
        (15, {'left_leg': (-0.45, 0, 0), 'right_leg': (0.45, 0, 0), 'left_arm': (0.35, 0, 0), 'right_arm': (-0.35, 0, 0)}, {}),
        (30, {'left_leg': (0.45, 0, 0), 'right_leg': (-0.45, 0, 0), 'left_arm': (-0.35, 0, 0), 'right_arm': (0.35, 0, 0)}, {})
    ]))
    actions.append(create_action(armature, bones, 'Run', [
        (1, {'left_leg': (0.9, 0, 0), 'right_leg': (-0.9, 0, 0), 'left_arm': (-0.8, 0, 0), 'right_arm': (0.8, 0, 0)}, {}),
        (10, {'left_leg': (-0.9, 0, 0), 'right_leg': (0.9, 0, 0), 'left_arm': (0.8, 0, 0), 'right_arm': (-0.8, 0, 0)}, {}),
        (20, {'left_leg': (0.9, 0, 0), 'right_leg': (-0.9, 0, 0), 'left_arm': (-0.8, 0, 0), 'right_arm': (0.8, 0, 0)}, {})
    ]))
    actions.append(create_action(armature, bones, 'Crouch', [(1, {'spine': (0.35, 0, 0), 'left_leg': (-0.55, 0, 0), 'right_leg': (-0.55, 0, 0)}, {'root': (0, 0, -0.35)}), (30, {'spine': (0.35, 0, 0), 'left_leg': (-0.55, 0, 0), 'right_leg': (-0.55, 0, 0)}, {'root': (0, 0, -0.35)})]))
    actions.append(create_action(armature, bones, 'Attack', [(1, {'right_arm': (-0.8, 0.2, 0)}, {}), (8, {'right_arm': (1.2, -0.5, 0), 'spine': (0, -0.4, 0)}, {}), (18, {'right_arm': (-0.3, 0, 0)}, {})]))
    actions.append(create_action(armature, bones, 'HeavyAttack', [(1, {'right_arm': (-1.4, 0.3, 0), 'spine': (0, 0.3, 0)}, {}), (12, {'right_arm': (1.5, -0.7, 0), 'spine': (0, -0.8, 0)}, {}), (28, {'right_arm': (-0.2, 0, 0)}, {})]))
    actions.append(create_action(armature, bones, 'Block', [(1, {'left_arm': (-0.9, -0.2, 0), 'right_arm': (-0.9, 0.2, 0), 'spine': (0.15, 0, 0)}, {}), (30, {'left_arm': (-0.9, -0.2, 0), 'right_arm': (-0.9, 0.2, 0), 'spine': (0.15, 0, 0)}, {})]))
    actions.append(create_action(armature, bones, 'Dodge', [(1, {'spine': (0, 0.8, 0), 'left_leg': (0.6, 0, 0), 'right_leg': (-0.4, 0, 0)}, {}), (10, {'spine': (0, -0.9, 0)}, {'root': (0, 0, 0.35)}), (22, {}, {})]))
    actions.append(create_action(armature, bones, 'Hit', [(1, {'spine': (-0.35, 0, 0), 'head': (-0.2, 0, 0)}, {}), (8, {'spine': (0.25, 0, 0)}, {}), (18, {}, {})]))
    actions.append(create_action(armature, bones, 'Death', [(1, {'spine': (0, 0, 0)}, {}), (18, {'spine': (1.3, 0, 0), 'left_leg': (-0.5, 0, 0), 'right_leg': (0.5, 0, 0)}, {'root': (0, 0, -0.6)}), (40, {'spine': (1.5, 0, 0)}, {'root': (0, 0, -1.0)})]))
    actions.append(create_action(armature, bones, 'BowRanged', [(1, {'left_arm': (-0.7, 0, 0), 'right_arm': (-0.5, 0, 0), 'spine': (0, 0.15, 0)}, {}), (15, {'left_arm': (-0.4, 0, 0), 'right_arm': (0.8, 0, 0)}, {}), (28, {}, {})]))
    actions.append(create_action(armature, bones, 'StaffCasting', [(1, {'right_arm': (-0.7, 0, 0), 'left_arm': (-0.4, 0, 0)}, {}), (18, {'right_arm': (0.8, 0, 0), 'left_arm': (-0.9, 0, 0), 'spine': (-0.2, 0, 0)}, {}), (35, {}, {})]))
    actions.append(create_action(armature, bones, 'DualWeapon', [(1, {'left_arm': (-0.8, 0, 0), 'right_arm': (0.8, 0, 0)}, {}), (8, {'left_arm': (0.9, 0, 0), 'right_arm': (-0.9, 0, 0)}, {}), (16, {'left_arm': (-0.8, 0, 0), 'right_arm': (0.8, 0, 0)}, {})]))
    actions.append(create_action(armature, bones, 'WeaponMagic', [(1, {'right_arm': (-0.9, 0, 0), 'left_arm': (-0.6, 0, 0)}, {}), (16, {'right_arm': (0.8, 0, 0), 'left_arm': (-1.0, 0, 0), 'spine': (-0.25, 0, 0)}, {}), (32, {}, {})]))
    return actions


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def main():
    paths = []
    for root, _, files in os.walk(SOURCE_ROOT):
        for filename in files:
            if filename.lower().endswith('.glb'):
                paths.append(os.path.join(root, filename))
    generated = 0
    for path in sorted(paths):
        clear_scene()
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        imported = [obj for obj in bpy.data.objects if obj not in before]
        armatures = [obj for obj in imported if obj.type == 'ARMATURE']
        if not armatures:
            continue
        armature = armatures[0]
        actions = make_actions(armature)
        if not actions:
            continue
        for action in actions:
            track = armature.animation_data_create().nla_tracks.new()
            track.name = action.name
            strip = track.strips.new(action.name, 1, action)
            strip.action_frame_start = 1
            strip.action_frame_end = action.frame_range[1]
        folder = os.path.basename(os.path.dirname(path))
        output = os.path.join(OUTPUT_ROOT, f'{folder}-animated.glb')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in imported:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = armature
        bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=True, export_nla_strips=True)
        generated += 1
        print(f'ANIMATED_EXPORT {output} actions={len(actions)}')
    print(f'ANIMATION_GENERATION_COMPLETE rigged_models={generated}')


main()
