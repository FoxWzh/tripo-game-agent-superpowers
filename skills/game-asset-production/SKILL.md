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

This runs doctor, planning, preflight, user confirmation, generation, inspection, and packaging.

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
- FBX may require a conversion step when Tripo returns GLB; package GLB as fallback and document the limitation.
- Multi-view generation is a higher-quality path for characters, but the current default script uses single-image `image_to_model`.
- Localized edits and modular fit are not full regeneration primitives yet; route them through memory/preflight and do not promise partial mesh surgery.

## Stop Condition

Never claim the asset is game-ready from production alone. Always pass to `game-asset-readiness`.
