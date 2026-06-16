# Architecture

## Superpowers Pattern

This plugin follows the `obra/superpowers` pattern:

```text
CLAUDE.md
  -> using-tripo-game-agent
      -> game-asset-intake
      -> game-asset-planning
      -> game-asset-production
      -> game-asset-readiness
      -> game-asset-memory
```

`CLAUDE.md` is the boot instruction. `using-tripo-game-agent` is the bootstrap skill that enforces method. The `game-asset-*` skills are composable business capabilities with input/output contracts.

## Why This Shape

The workflow is not split into nine tiny skills. It is split by stable knowledge domain:

- Intake: user intent, asset taxonomy, engine presets, clarification.
- Planning: workflow templates, cost/time, tiers, risks, fallback policy.
- Production: generation and optimization execution mapping.
- Readiness: game usability checks, repairs, downgrade, package schema.
- Memory: iteration, variants, series reuse.

## Required State Machine

```text
intake
  -> planning
  -> production
  -> readiness
  -> memory
```

Control rules:

- Do not skip intake.
- Do not enter planning if blocking info is missing.
- Do not enter production before showing the Production Plan.
- Do not package final assets before readiness review.
- If readiness fails, repair or fallback before final package.

## Game Asset Workflow Templates

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

## Tool Mapping

Tools are real local scripts. Tripo generation is executed through the public API adapter:

- `scripts/setup.mjs`
- `scripts/doctor.mjs`
- `scripts/tripo_client.mjs`
- `scripts/plan_game_asset.mjs`
- `scripts/generate_game_asset.mjs`
- `scripts/inspect_game_asset.mjs`
- `scripts/package_engine_asset.mjs`
