---
name: game-asset-planning
description: Use after game-asset-intake to turn an Asset Brief into a user-visible Production Plan with workflow, parameters, tiers, cost/time estimates, risks, and fallback policy.
---

# Game Asset Planning

Use this skill only after an Asset Brief exists.

Planning is the product confirmation layer between "the agent understood me" and "the agent starts spending credits/time."

After planning, always run `game-asset-preflight`. Planning defines what should happen; preflight decides whether the next real Tripo call has enough input quality to be worth the cost.

## Input

Asset Brief from `game-asset-intake`.

## Output: Production Plan

Always produce:

```json
{
  "workflow_name": "GameReadyCharacter|GameReadyProp|GameReadyWeapon|GameReadyEnvironment|ModularGameAsset",
  "dag": [],
  "parameters": {},
  "execution_tiers": [],
  "estimated_credits": "",
  "estimated_time": "",
  "risk_points": [],
  "fallback_policy": [],
  "expected_package": [],
  "preflight_questions": []
}
```

## Workflow Templates

### GameReadyCharacter

```text
ImageTo3D or MultiViewTo3D
  -> Retopo(mode=quad, target=<poly_budget>)
  -> UVUnwrap
  -> PBRTexture(workflow=metal-rough, size=<texture_size>)
  -> Rig(type=<engine humanoid preset>)
  -> ReadinessReview
  -> ExportFBX(textures=zip)
```

### GameReadyProp

```text
ImageTo3D or TextTo3D
  -> Retopo(mode=tri_or_quad, target=<poly_budget>)
  -> UVUnwrap
  -> PBRTexture(size=<texture_size>)
  -> PivotScaleCheck
  -> ColliderHint
  -> ReadinessReview
  -> ExportFBX or ExportGLB
```

### GameReadyWeapon

```text
ImageTo3D or TextTo3D
  -> Retopo(target=<poly_budget>)
  -> UVUnwrap
  -> PBRTexture
  -> GripPivotCheck
  -> ScaleCheck
  -> ReadinessReview
  -> ExportFBX
```

### GameReadyEnvironment

```text
TextTo3D or ImageTo3D
  -> Segment
  -> OptimizeMesh
  -> GenerateLOD
  -> PBRTexture
  -> ColliderHint
  -> ReadinessReview
  -> ExportGLB or ExportFBX
```

### ModularGameAsset

```text
LoadBaseAsset
  -> StyleLock
  -> GenerateAttachment
  -> FitToBaseMesh
  -> TextureMatch
  -> ReadinessReview
  -> ExportPack
```

## Execution Tiers

- Draft: fastest preview, cheapest, no final readiness guarantee.
- Standard: optimized mesh + PBR + engine export.
- Full: Standard plus rig/LOD/import guide/readiness report when relevant.

## Cost/Time Estimate Defaults

- Character Draft: 6 credits / 2-3 min.
- Character Standard without rig: 24-27 credits / 6-8 min.
- Character Full with rig: 34 credits / 8-12 min.
- Static prop Standard: 12-18 credits / 4-7 min.
- Weapon Standard: 14-20 credits / 4-8 min.
- Modular attachment: 24-45 credits / 8-18 min.

These are demo estimates, not Tripo billing facts.

## Risk Points

Common risks:

- Thin hard-surface parts may fail Retopo.
- Non-standard bodies may fail humanoid rig.
- Metallic materials may need PBR retry.
- High texture size increases timeout risk.
- Modular assets need base mesh fit; missing base asset blocks execution.
- FBX, humanoid rig, and UE Manny compatibility may need post-generation conversion or Blender validation.
- Single-image characters often fail on unseen back/side details; multi-view input materially improves the call.
- Unity/Unreal import readiness depends on scale, pivot, material slots, collider/LOD policy, and not only model generation.

## Preflight Questions By Workflow

Ask only the questions that affect this run:

- Character: Do we have front/back/side views? What rig preset? What poly budget? Is face fidelity or runtime topology more important?
- Prop/weapon: What pivot should the engine use? What real-world scale? Is it held, placed, or pickup-able?
- Environment: Is this a single set piece or modular kit? Need LOD/collider? What scale reference?
- Modular part: What is the base asset id/path? Does it need visual fit, socket fit, or topology-compatible fit?

## Stop Condition

Show the Production Plan before preflight. Do not start production if the plan has unresolved blocking risks, preflight blockers, or if the user chose a cheaper tier that changes deliverables.
