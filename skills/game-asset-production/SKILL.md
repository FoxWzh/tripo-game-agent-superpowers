---
name: game-asset-production
description: Use after planning to execute the real Tripo game asset generation workflow, including image-to-model generation, downloads, and local production result files.
---

# Game Asset Production

Use this skill only after a Production Plan and Preflight Report exist.

This skill has a real Tripo API execution path. Do not mock generation.

## Input

Production Plan from `game-asset-planning`, written to `workspace/production_plan.json`, and Preflight Report from `game-asset-preflight`.

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

## Required Command

Preferred full chain:

```bash
./bin/tripo-agent run --prompt "<game asset request>" --input assets/<reference-image>.png --engine Unity
```

This runs doctor, planning, preflight, user confirmation, generation, optional conversion, inspection, and packaging.

If running manually, run preflight first:

```bash
./bin/tripo-agent preflight --input assets/<reference-image>.png --engine Unity
```

Only continue if blockers are resolved.

Run:

```bash
./bin/tripo-agent generate --input assets/<reference-image>.png
```

This creates a real Tripo `image_to_model` task, polls it, downloads task outputs immediately, and writes `workspace/production_result.json`.

If the Production Plan route is `multiview_to_model`, pass real or generated views:

```bash
./bin/tripo-agent generate \
  --front assets/front.png \
  --back assets/back.png \
  --left assets/left.png \
  --right assets/right.png
```

If the user chooses candidate multiview generation first:

```bash
./bin/tripo-agent synthesize-views --input assets/front.png
```

Open synthesized views for user confirmation before running 3D generation.

## User Confirmation UI

After any generated image or 3D file is downloaded, open the best local artifact automatically so the user can confirm it:

- image preview: `png`, `jpg`, `webp`
- model preview: `glb`, `gltf`, `fbx`, `obj`

Use `--no-open` or `TRIPO_AGENT_NO_OPEN=1` only for CI or headless runs.

## Format Conversion

When the target engine expects FBX/OBJ/STL/GLTF rather than the source downloaded model, use Tripo conversion:

```bash
./bin/tripo-agent convert --format FBX
```

This creates a `convert_model` task using the original Tripo model task id, polls it, downloads converted files under `outputs/<asset_id>/converted/`, and opens the converted asset for confirmation.

Game defaults:

- Unity character/weapon: prefer `FBX`.
- Unreal character/weapon: prefer `FBX`.
- Godot static asset: `GLTF` or `GLB` fallback.
- Roblox/mobile prototype: low-poly `FBX` or `GLB` depending pipeline.

## Rigging Route

For character assets, run pre-rig check before auto-rig:

```bash
./bin/tripo-agent rig --preset unity-humanoid
```

Only if the user confirms:

```bash
./bin/tripo-agent rig --preset unity-humanoid --apply
```

The rig command uses Tripo `animate_prerigcheck` before `animate_rig`, downloads rigged files under `outputs/<asset_id>/rigged/`, and opens them for confirmation.

### Mesh Optimization

Rules:

- Character default: quad Retopo.
- Static prop: tri is acceptable if engine-ready and visually stable.
- Mobile/Roblox: prefer lower budget.
- Cinematic: preserve more detail, but still run readiness review.

### UV and Materials

Rules:

- Default workflow: PBR metal-rough.
- Standard texture size: 2K.
- 4K is higher risk and should be explicit.

### Rigging

Rules:

- Only character/creature assets need rig by default.
- Unity character: Unity humanoid mapping.
- Unreal character: UE Manny compatibility if requested.
- If rig fails, continue to readiness with a no-rig fallback candidate.

### Engine Prep

Rules:

- Weapons need grip pivot.
- Props often need bottom or center pivot.
- Environments need collider hints and LOD attention.

## Failure Logging

Every failed or degraded step must log to `outputs/<asset_id>/production_result.json` or the thrown command error:

```text
Failed step:
Reason:
Decision:
User-facing impact:
```

## Current Real-Execution Limits

Be explicit when these are not yet fully automated:

- Rigging is planned and checked as a requirement, but final humanoid rig validation may require Tripo rigging endpoints and Blender/engine-side validation.
- Rigging has a command path, but auto-rig should remain user-confirmed because it can spend credits and may fail on non-humanoid shapes.
- FBX should be attempted through Tripo conversion when requested by the engine; package GLB as fallback if conversion fails.
- Multi-view generation is a higher-quality path for characters when real or accepted generated views exist.
- `multiview_to_model` is supported when inventory/model_route selects it, but generated multiview views still need user acceptance before 3D.
- Localized edits and modular fit are not full regeneration primitives yet; route them through memory/preflight and do not promise partial mesh surgery.

## Stop Condition

Never claim the asset is game-ready from production alone. Always pass to `game-asset-readiness`.
