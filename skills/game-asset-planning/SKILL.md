---
name: game-asset-planning
description: Use after game-asset-intake to turn an Asset Brief into a user-visible Production Plan with workflow, parameters, tiers, cost/time estimates, risks, and fallback policy.
---

# Game Asset Planning

Use this skill only after an Asset Brief exists.

Planning is the product confirmation layer between "the agent understood me" and "the agent starts spending credits/time."

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
  "expected_package": []
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

## Stop Condition

Show the Production Plan before production. Do not start production if the plan has unresolved blocking risks or if the user chose a cheaper tier that changes deliverables.
