import json
import os
import sys

import bpy


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) < 2:
        raise SystemExit("Usage: blender --background --python blender_inspect.py -- <model> <report>")

    model_path = os.path.abspath(args[0])
    report_path = os.path.abspath(args[1])

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    ext = os.path.splitext(model_path)[1].lower()
    if ext in [".glb", ".gltf"]:
        bpy.ops.import_scene.gltf(filepath=model_path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=model_path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=model_path)
    else:
        raise SystemExit(f"Unsupported model format for Blender inspection: {ext}")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    materials = set()
    triangle_count = 0
    vertex_count = 0
    for obj in meshes:
        mesh = obj.data
        vertex_count += len(mesh.vertices)
        for poly in mesh.polygons:
            triangle_count += max(1, len(poly.vertices) - 2)
        for slot in obj.material_slots:
            if slot.material:
                materials.add(slot.material.name)

    report = {
        "model": model_path,
        "status": "pass",
        "mesh_count": len(meshes),
        "armature_count": len(armatures),
        "material_count": len(materials),
        "vertex_count": vertex_count,
        "triangle_count": triangle_count,
        "object_names": [obj.name for obj in bpy.context.scene.objects],
        "warnings": []
    }

    if not meshes:
        report["status"] = "fail"
        report["warnings"].append("No mesh objects found.")
    if ext == ".fbx" and not armatures:
        report["warnings"].append("No armature found in FBX; rigged character validation may fail.")

    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


if __name__ == "__main__":
    main()
