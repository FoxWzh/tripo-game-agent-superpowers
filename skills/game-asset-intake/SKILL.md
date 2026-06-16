---
name: game-asset-intake
description: Use to understand a user's game asset goal, classify the asset type, infer or ask for engine constraints, and output an Asset Brief before planning.
---

# Game Asset Intake

Use this skill first for any game-ready 3D asset request.

## Input

User natural-language request, optional reference image/model context, and any existing project constraints.

## Output: Asset Brief

Always produce an Asset Brief:

```json
{
  "asset_type": "character|prop|weapon|vehicle|environment|modular_part|unknown",
  "engine": "Unity|Unreal|Roblox|Godot|unknown",
  "usage": "runtime|cinematic|prototype|marketplace|unknown",
  "format": "FBX|GLB|OBJ|unknown",
  "poly_budget": "mobile|indie|aa|cinematic|custom|unknown",
  "texture_workflow": "PBR metal-rough|spec-gloss|basecolor-only|unknown",
  "texture_size": "1K|2K|4K|unknown",
  "rig_required": true,
  "lod_required": false,
  "collider_required": false,
  "scale_unit": "meter|centimeter|unknown",
  "pivot_rule": "center|bottom|grip|unknown",
  "missing_info": [],
  "confidence": 0.0
}
```

## Asset Taxonomy

- `character`: humanoid, creature, NPC, player avatar. Usually needs rig, animation compatibility, stricter topology.
- `prop`: static item, pickup, decoration. Usually needs pivot, scale, material, optional collider.
- `weapon`: sword, gun, staff. Needs grip pivot, scale, material, optional collider.
- `vehicle`: car, spaceship, mech vehicle. Needs pivots, separated moving parts, optional collision.
- `environment`: rocks, buildings, terrain chunks, set pieces. Needs LOD, collider, tiling/scale concerns.
- `modular_part`: armor, outfit, attachment, replacement part. Needs fit to existing base asset and style lock.

## Engine Presets

### Unity

- Preferred format: FBX for rigged assets, GLB acceptable for static preview.
- Unit: meter.
- Character rig: Unity humanoid when possible.
- Texture workflow: PBR metal-rough default.
- Default texture size: 2K for indie/standard.
- Common checks: scale, pivot, material slot names, humanoid mapping, missing texture maps.

### Unreal

- Preferred format: FBX.
- Unit: centimeter.
- Character rig: UE Manny compatible if requested.
- Texture workflow: PBR metal-rough.
- Common checks: skeleton compatibility, normal/tangent quality, LOD groups, import scale.

### Roblox

- Preferred format: FBX or GLB depending target pipeline.
- Bias toward lower poly budgets and simpler materials.
- Common checks: strict scale, part separation, performance budget.

### Godot

- Preferred format: GLB for many workflows.
- Common checks: material compatibility, node hierarchy, scale, collision hints.

## Clarification Policy

Ask clarification before planning when:

- Engine is unknown and the request mentions "game" only.
- Asset type is ambiguous.
- Rig requirement changes the cost materially.
- User asks for "game-ready" but gives no quality/performance target.

Use defaults when:

- User names Unity and a character: assume FBX, meter, humanoid rig, 15k indie budget, 2K PBR.
- User names Unreal and a character: assume FBX, centimeter, optional UE Manny compatibility, 20k indie/AA budget, 2K PBR.
- User names a static prop: assume no rig, pivot required, PBR 2K, collider hint optional.

## Stop Condition

If `confidence < 0.7` or `missing_info` contains blocking items, return clarification questions and do not continue to planning.
