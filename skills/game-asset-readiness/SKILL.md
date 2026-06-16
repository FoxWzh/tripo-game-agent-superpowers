---
name: game-asset-readiness
description: Use after production to inspect game-readiness, decide repair or fallback, and package assets for Unity, Unreal, Roblox, or Godot.
---

# Game Asset Readiness

Use this skill after production. This is the quality gate that decides whether the asset is engine-ready, needs repair, or should be delivered with a downgraded scope.

Inspection and packaging are real local steps. They inspect downloaded model files and create a real zip package. Deeper FBX/rig validation may require Blender.

## Input

Production Result from `game-asset-production`.

Run:

```bash
./bin/tripo-agent inspect
./bin/tripo-agent convert --format FBX, if target engine needs FBX and conversion has not run yet
./bin/tripo-agent package-asset --engine unity
```

## Output: Readiness Report

```json
{
  "status": "pass|repair_required|fallback_used|fail",
  "checks": [],
  "repairs": [],
  "fallbacks": [],
  "package_manifest": [],
  "user_notes": []
}
```

## Readiness Checklist

Every report should separate:

- `passed`: checked locally and passed.
- `warning`: deliverable usable with documented limitation.
- `blocked`: cannot present as engine-ready.
- `roadmap`: important game requirement not automated in this local MVP.

### Mesh

- Polycount within target.
- No severe non-manifold geometry.
- Normals/tangents usable.
- Retopo result matches selected tier.
- LOD generated when required.

### UV and Texture

- UV overlap below acceptable threshold.
- Required PBR maps present.
- Texture resolution matches tier.
- Material slot names are engine-readable.
- Missing maps are documented.

### Rig and Animation

- Rig exists if required.
- Humanoid mapping passes target engine requirements.
- Skeleton naming is consistent.
- Non-standard body risks are documented.

### Engine Import

- Format matches engine target.
- Unit scale is correct.
- Pivot rule is satisfied.
- Collider hint exists when needed.
- Import smoke test passes or failure is documented.
- Converted format exists when requested by the Production Plan.

### Game Problems Not Solved By Basic GLB Generation

Track these explicitly instead of hiding them:

- Character rig compatibility: Unity Humanoid / UE Manny / custom skeleton.
- FBX conversion and texture zip structure.
- Quad topology guarantee and face budget verification.
- LOD generation and collider authoring.
- Pivot/socket placement for weapons and modular attachments.
- Modular fit to a base character.
- Localized edits without full regeneration.

## Repair and Fallback Policy

- 4K texture timeout -> retry once -> downgrade to 2K.
- Retopo over budget -> reduce target faces -> if still unstable, deliver tri mesh with warning.
- Rig failed -> deliver no-rig version plus rig failure report.
- PBR failed -> deliver basecolor preview plus pending PBR note.
- FBX export failed -> GLB fallback plus compatibility note.
- Unity import issue -> include issue report and import workaround.
- Missing rig automation -> deliver static model package and mark rig as blocked or roadmap.
- Failed FBX conversion -> deliver GLB fallback and mark FBX as `fallback_used`.

## Package Schema

### Unity Character Package

```text
asset_name_unity_fbx.zip
├── models/
│   └── asset_name.fbx
├── textures/
│   ├── basecolor_2k.png
│   ├── normal_2k.png
│   ├── metallic_roughness_2k.png
│   └── ao_2k.png
├── rig/
│   └── humanoid_mapping.json
└── report/
    ├── readiness_report.md
    ├── import_unity.md
    ├── cost_breakdown.md
    └── fallback_log.md
```

### Static Prop Package

```text
asset_name_engine_pack.zip
├── models/
│   └── asset_name.fbx or asset_name.glb
├── textures/
├── collider/
│   └── collider_hints.md
└── report/
```

## Stop Condition

If status is `fail`, do not present the package as engine-ready. Present it as a diagnostic artifact and explain next options.
