---
name: game-asset-production
description: Use after planning to execute or mock the game asset generation and optimization workflow, including model generation, retopo, UV, PBR, rig, LOD, pivot, scale, and collider preparation.
---

# Game Asset Production

Use this skill only after a Production Plan exists.

In this portfolio demo, every production action is `[MOCK]`. In a real product, these actions map to Tripo APIs, internal asset processors, Blender automation, or engine import tools.

## Input

Production Plan from `game-asset-planning`.

## Output: Production Result

```json
{
  "generated_assets": [],
  "step_logs": [],
  "cost_spent": "",
  "time_spent": "",
  "warnings": [],
  "failed_steps": [],
  "next_required_stage": "game-asset-readiness"
}
```

## Production Actions

### Base Generation

Possible tools:

- `generate_model`
- `image_to_3d`
- `text_to_3d`
- `multiview_to_3d`

Demo behavior:

```text
[MOCK] Generate base model from reference.
```

### Mesh Optimization

Possible tools:

- `retopo_mesh`
- `optimize_mesh`
- `generate_lod`

Rules:

- Character default: quad Retopo.
- Static prop: tri is acceptable if engine-ready and visually stable.
- Mobile/Roblox: prefer lower budget.
- Cinematic: preserve more detail, but still run readiness review.

### UV and Materials

Possible tools:

- `unwrap_uv`
- `generate_pbr_textures`
- `bake_maps`

Rules:

- Default workflow: PBR metal-rough.
- Standard texture size: 2K.
- 4K is higher risk and should be explicit.

### Rigging

Possible tools:

- `rig_character`
- `map_humanoid_skeleton`

Rules:

- Only character/creature assets need rig by default.
- Unity character: Unity humanoid mapping.
- Unreal character: UE Manny compatibility if requested.
- If rig fails, continue to readiness with a no-rig fallback candidate.

### Engine Prep

Possible tools:

- `set_pivot`
- `normalize_scale`
- `suggest_collider`
- `name_material_slots`

Rules:

- Weapons need grip pivot.
- Props often need bottom or center pivot.
- Environments need collider hints and LOD attention.

## Failure Logging

Every failed or degraded step must log:

```text
[MOCK] Failed step:
[MOCK] Reason:
[MOCK] Decision:
[MOCK] User-facing impact:
```

## Stop Condition

Never claim the asset is game-ready from production alone. Always pass to `game-asset-readiness`.
